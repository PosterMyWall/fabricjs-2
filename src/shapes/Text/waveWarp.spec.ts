import { describe, expect, it } from 'vitest';
import { Textbox } from '../Textbox';
import { Path } from '../Path';
import { createCanvasElement } from '../../util/misc/dom';

const CANVAS_SIZE = 600;
const FONT_SIZE = 40;
const AMPLITUDE = 30;

const render = (text: Textbox): CanvasRenderingContext2D => {
  const canvas = createCanvasElement();
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  text._render(ctx);
  return ctx;
};

/** The middle of the inked rows in the given column band, or null when the band is blank. */
const getInkMiddle = (
  ctx: CanvasRenderingContext2D,
  fromX: number,
  toX: number,
): number | null => {
  const left = Math.round(fromX);
  const width = Math.round(toX) - left;
  const { data } = ctx.getImageData(left, 0, width, CANVAS_SIZE);
  let first = -1;
  let last = -1;
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        first = first === -1 ? y : first;
        last = y;
      }
    }
  }
  return first === -1 ? null : (first + last) / 2;
};

const makeWavyText = (startsWithTrough = false): Textbox => {
  const text = new Textbox('wave wave wave', {
    fontSize: FONT_SIZE,
    fontFamily: 'Arial',
    width: 1000,
    fill: 'black',
  });
  const length = text.calcTextWidth();
  text.set({
    path: new Path(`M 0 0 L ${length} 0`, { visible: false }),
    waveWarp: { amplitude: AMPLITUDE, periods: 1, startsWithTrough },
  });
  return text;
};

describe('waveWarp (PMW)', () => {
  it('bends the flat line by the sine: the first quarter rises by the amplitude and the third quarter sinks by it', () => {
    const text = makeWavyText();
    const length = text.path!.width;
    const ctx = render(text);
    const start = CANVAS_SIZE / 2 - length / 2;
    const peak = getInkMiddle(ctx, start + length * 0.2, start + length * 0.3);
    const trough = getInkMiddle(
      ctx,
      start + length * 0.7,
      start + length * 0.8,
    );
    const ends = getInkMiddle(ctx, start, start + length * 0.05);

    expect(peak).not.toBeNull();
    expect(trough).not.toBeNull();
    expect(ends).not.toBeNull();
    expect(trough! - peak!).toBeGreaterThan(2 * AMPLITUDE * 0.8);
    expect(Math.abs((peak! + trough!) / 2 - ends!)).toBeLessThan(
      FONT_SIZE * 0.25,
    );
  });

  it('starts with a trough when asked', () => {
    const peakFirst = render(makeWavyText(false));
    const troughFirst = render(makeWavyText(true));
    const length = makeWavyText().path!.width;
    const start = CANVAS_SIZE / 2 - length / 2;
    const band: [number, number] = [start + length * 0.2, start + length * 0.3];

    expect(
      getInkMiddle(troughFirst, ...band)! - getInkMiddle(peakFirst, ...band)!,
    ).toBeGreaterThan(2 * AMPLITUDE * 0.8);
  });

  it('is ignored without a path, and leaves the box laid out as the path sized it', () => {
    const plain = new Textbox('wave wave wave', {
      fontSize: FONT_SIZE,
      fontFamily: 'Arial',
      width: 1000,
      fill: 'black',
    });
    const warpedWithoutPath = new Textbox('wave wave wave', {
      fontSize: FONT_SIZE,
      fontFamily: 'Arial',
      width: 1000,
      fill: 'black',
    });
    warpedWithoutPath.set({
      waveWarp: { amplitude: AMPLITUDE, periods: 1, startsWithTrough: false },
    });

    expect(
      render(warpedWithoutPath).getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        .data,
    ).toEqual(render(plain).getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data);
    const wavy = makeWavyText();
    const widthBefore = wavy.width;
    render(wavy);
    expect(wavy.width).toBe(widthBefore);
    expect(wavy.path).toBeDefined();
  });
});
