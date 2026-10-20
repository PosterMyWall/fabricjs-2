import { Path } from '../shapes/Path';
import { Rect } from '../shapes/Rect';
import { loadSVGFromString } from './loadSVGFromString';

import { describe, expect, it } from 'vitest';
import { Polygon } from '../../fabric';
import { FabricText } from '../shapes/Text/Text';

const SVG_DOC_AS_STRING =
  '<?xml version="1.0"?>\
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\
      <polygon fill="red" stroke="blue" stroke-width="10" points="350, 75 379,161 469,161\
        397,215 423,301 350,250 277,301 303,215 231,161 321,161" />\
    </svg>';

describe('loadSVGFromString', () => {
  it('returns successful parse of svg with use tag containing bad reference', async () => {
    // in this case, ignore bad use but still load rest of svg
    const str = `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <rect width="10" height="10" />
      <use href="#missing" x="50" y="50" ></use>
      </svg>`;

    const parsedSvg = await loadSVGFromString(str);
    expect(parsedSvg.objects[0]).not.toBeNull();
    if (parsedSvg.objects[0] !== null) {
      expect(parsedSvg.objects[0].isType('Rect')).toBe(true);
    }
  });

  it('returns successful parse of svg with use tag containing bad clip-path', async () => {
    // in this case, load svg but ignore clip-path attribute in <use>
    const str = `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
      <path id="heart" d="M10,30 A20,20,0,0,1,50,30 A20,20,0,0,1,90,30 Q90,60,50,90 Q10,60,10,30 Z" />
      </defs>
      <use clip-path="url(#myClip)" href="#heart" fill="red" />
      </svg>`;

    const parsedSvg = await loadSVGFromString(str);
    if (parsedSvg.objects[0] !== null) {
      expect(parsedSvg.objects[0] instanceof Path).toBe(true);
    }
  });

  it('returns successful parse of svg with id starting with number', async () => {
    const str = `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <rect id="123xyz" width="10" height="10" />
      </svg>`;

    const parsedSvg = await loadSVGFromString(str);

    expect(
      parsedSvg.objects[0] instanceof Rect &&
        (parsedSvg.objects[0] as Rect & { id: string }).id,
    ).toBe('123xyz');
  });

  it('loads SVG from string correctly', async () => {
    expect(loadSVGFromString).toBeTypeOf('function');

    const { objects: loadedObjects } =
      await loadSVGFromString(SVG_DOC_AS_STRING);
    expect(loadedObjects[0]).toBeInstanceOf(Polygon);
    expect(loadedObjects[0]!.fill).toBe('red');
  });

  it('loads SVG with surrounding whitespace correctly', async () => {
    const { objects } = await loadSVGFromString(
      '   \n\n  ' + SVG_DOC_AS_STRING + '  ',
    );
    expect(objects[0]).toBeInstanceOf(Polygon);
    expect(objects[0]!.fill).toBe('red');
  });

  /**
   * *PMW* Office exports write `letter-spacing: normal` on their `<text>`. The CSS keyword
   * has no unit, so it must read as no extra spacing (0) rather than survive as the raw
   * string, which poisons every character position with NaN and, through the glyph
   * overhang, sizes the text's cache canvas to 0 (`drawImage` then throws on render).
   */
  it('reads a letter-spacing of "normal" as no extra spacing', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">
      <text font-size="30" letter-spacing="normal" transform="translate(10 40)">From attribute</text>
      <text font-size="30" style="letter-spacing: normal" transform="translate(10 80)">From style</text>
      </svg>`;

    const { objects } = await loadSVGFromString(svg);
    expect(objects).toHaveLength(2);
    for (const object of objects) {
      const text = object as FabricText;
      expect(text).toBeInstanceOf(FabricText);
      expect(text.charSpacing).toBe(0);
      expect(Number.isFinite(text.getLineWidth(0))).toBe(true);
      const { width, height } = text._getCacheCanvasDimensions();
      expect(Number.isFinite(width)).toBe(true);
      expect(Number.isFinite(height)).toBe(true);
    }
  });
});
