import { describe, expect, it } from 'vitest';
import { Textbox } from '../Textbox';
import { FabricText } from './Text';
import { Gradient } from '../../gradient/Gradient';
import { FabricError } from '../../util/internals/console';

const tspans = (svg: string) =>
  [...svg.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)].map((m) => ({
    attrs: m[1],
    text: m[2],
  }));
const numberAttr = (attrs: string, name: string) =>
  parseFloat(attrs.match(new RegExp(`${name}="(-?[\\d.]+)"`))![1]);

describe('list markers and styled-character gradients in the SVG export', () => {
  it("exports a listed row's marker as a span left of the text, where the canvas draws it", () => {
    const tb = new Textbox('item one\nplain', {
      width: 300,
      fontSize: 20,
      lineStyles: { 0: { listMarker: '1.' } },
    } as never);
    const spans = tspans(tb.toSVG());
    const marker = spans.find((span) => span.text === '1.');
    const firstChar = spans.find((span) => span.text.startsWith('i'));
    if (!marker || !firstChar) {
      throw new FabricError('marker or text span missing');
    }
    const placed = tb._getListMarkerPlacement(
      0,
      -tb.width / 2 + tb._getLineLeftOffset(0),
      -tb.height / 2 + tb.getHeightOfLineImpl(0),
    )!;
    expect(numberAttr(marker.attrs, 'x')).toBeCloseTo(placed.left, 1);
    expect(numberAttr(marker.attrs, 'y')).toBeCloseTo(placed.baseline, 1);
    expect(numberAttr(marker.attrs, 'x')).toBeLessThan(
      numberAttr(firstChar.attrs, 'x'),
    );
    expect(numberAttr(marker.attrs, 'y')).toBeCloseTo(
      numberAttr(firstChar.attrs, 'y'),
      1,
    );
    expect(marker.attrs).toContain('font-size: 20px');
    // the plain row gets no marker span
    expect(spans.filter((span) => span.text === '1.')).toHaveLength(1);
  });

  it('gives an unordered marker its own font family and the explicit marker fill', () => {
    const tb = new Textbox('item', {
      width: 300,
      fontSize: 20,
      lineStyles: {
        0: {
          listMarker: 'A',
          listMarkerFontFamily: 'bullets',
          listMarkerFill: 'rgb(255, 0, 0)',
        },
      },
    } as never);
    const marker = tspans(tb.toSVG()).find((span) => span.text === 'A');
    expect(marker?.attrs).toContain("font-family: 'bullets'");
    expect(marker?.attrs).toContain('fill: rgb(255,0,0)');
  });

  it('places only one marker on a wrapped listed line, on its first row', () => {
    const tb = new Textbox('one two three four five six', {
      width: 90,
      fontSize: 20,
      lineStyles: { 0: { listMarker: '•' } },
    } as never);
    expect(tb._textLines.length).toBeGreaterThan(1);
    const markers = tspans(tb.toSVG()).filter((span) => span.text === '•');
    expect(markers).toHaveLength(1);
  });

  it('mirrors the marker to the right of a right-to-left row', () => {
    const tb = new Textbox('item', {
      width: 300,
      fontSize: 20,
      direction: 'rtl',
      lineStyles: { 0: { listMarker: '1.' } },
    } as never);
    const spans = tspans(tb.toSVG());
    const marker = spans.find((span) => span.text === '1.')!;
    const firstChar = spans.find((span) => span.text.startsWith('i'))!;
    expect(numberAttr(marker.attrs, 'x')).toBeGreaterThan(
      numberAttr(firstChar.attrs, 'x'),
    );
  });

  it("writes the gradient definition a styled character's fill references", () => {
    const charGradient = new Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: 0, y2: 20 },
      colorStops: [
        { offset: 0, color: 'rgb(255, 0, 0)' },
        { offset: 1, color: 'rgb(0, 0, 255)' },
      ],
    });
    const text = new FabricText('ab', { fontSize: 20 });
    text.styles = {
      0: { 0: { fill: charGradient }, 1: { fill: charGradient } },
    } as never;
    const svg = text.toSVG();
    const id = `SVGID_${charGradient.id}`;
    expect(svg).toContain(`fill: url(#${id})`);
    expect(
      svg.match(new RegExp(`<linearGradient id="${id}"`, 'g')),
    ).toHaveLength(1);
    expect(svg.indexOf('<linearGradient')).toBeLessThan(svg.indexOf('<text'));
  });

  it('writes nothing extra for text without styled gradients', () => {
    const text = new FabricText('ab', { fontSize: 20, fill: 'rgb(0, 0, 0)' });
    expect(text.toSVG()).not.toContain('Gradient');
  });
});
