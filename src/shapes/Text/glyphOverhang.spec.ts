import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FabricText } from './Text';
import { Textbox } from '../Textbox';
import { Group } from '../Group';
import { Path } from '../Path';
import { cache } from '../../cache';
import { createCanvasElement } from '../../util/misc/dom';

/**
 * *PMW* Glyph overhang: the reach of painted ink past the text box, measured from the
 * browser's `actualBoundingBox*` metrics so the cache canvas (and anything else that clips
 * to the box) can make room for script swashes and deep descenders of any font.
 */

const FAMILY = 'SwashTest';
const FONT_SIZE = 40;
/** The measuring context works at CACHE_FONT_SIZE (400), so metrics scale by 0.1 at 40px. */
const SCALE = FONT_SIZE / 400;
/** ink metrics at CACHE_FONT_SIZE, keyed by grapheme */
const INK: Record<
  string,
  {
    width: number;
    left: number;
    right: number;
    ascent: number;
    descent: number;
  }
> = {
  // reaches 300 left of its origin, like a swashed capital
  L: { width: 200, left: 300, right: 200, ascent: 280, descent: 0 },
  // crossbar reaches 440 right of the origin on a 200 advance
  T: { width: 200, left: 0, right: 440, ascent: 280, descent: 0 },
  // descends 250 below the baseline
  j: { width: 100, left: 20, right: 100, ascent: 280, descent: 250 },
  // fits its advance
  o: { width: 200, left: 0, right: 200, ascent: 200, descent: 0 },
};

describe('glyph overhang', () => {
  let measureText: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cache.clearFontCache();
    const context = createCanvasElement().getContext('2d')!;
    const prototype = Object.getPrototypeOf(context);
    const original = prototype.measureText;
    measureText = vi
      .spyOn(prototype, 'measureText')
      .mockImplementation(function (
        this: CanvasRenderingContext2D,
        text: string,
      ) {
        const graphemes = [...text].map((grapheme) => INK[grapheme]);
        if (!this.font.includes(FAMILY) || graphemes.some((ink) => !ink)) {
          return original.call(this, text);
        }
        // fabric also measures kerning couples: lay the graphemes out without kerning
        const width = graphemes.reduce((sum, ink) => sum + ink.width, 0);
        const last = graphemes[graphemes.length - 1];
        return {
          width,
          actualBoundingBoxLeft: graphemes[0].left,
          actualBoundingBoxRight: width - last.width + last.right,
          actualBoundingBoxAscent: Math.max(
            ...graphemes.map((ink) => ink.ascent),
          ),
          actualBoundingBoxDescent: Math.max(
            ...graphemes.map((ink) => ink.descent),
          ),
        } as TextMetrics;
      });
  });

  afterEach(() => {
    measureText.mockRestore();
    cache.clearFontCache();
  });

  const makeText = (text: string, options = {}) =>
    new FabricText(text, {
      fontFamily: FAMILY,
      fontSize: FONT_SIZE,
      lineHeight: 1,
      ...options,
    });

  it('reports the reach of a first glyph left of the box', () => {
    const text = makeText('Lo');
    expect(text.getGlyphOverhang()).toEqual({
      horizontal: 300 * SCALE,
      vertical: 0,
    });
  });

  it('reports the reach of a last glyph right of the box', () => {
    const text = makeText('oT');
    // the T starts at 200 and its ink ends at 200 + 440, past the 400-wide box
    expect(text.getGlyphOverhang().horizontal).toBeCloseTo(240 * SCALE, 6);
  });

  it('uses the alignment offset: a centered short line keeps its swash inside a wide box', () => {
    const textbox = new Textbox('Lo', {
      fontFamily: FAMILY,
      fontSize: FONT_SIZE,
      lineHeight: 1,
      textAlign: 'center',
      width: 1000,
    });
    expect(textbox.getGlyphOverhang().horizontal).toBe(0);
  });

  it('reports a descender below the last line and nothing above a fitting ascender', () => {
    const text = makeText('oj');
    // one line: height = 40 × 1.13, baseline at 1.13 × (1 − 0.222) × 40 from the top
    const lineHeight = FONT_SIZE * text._fontSizeMult;
    const roomBelowBaseline = lineHeight * text._fontSizeFraction;
    expect(text.getGlyphOverhang().vertical).toBeCloseTo(
      250 * SCALE - roomBelowBaseline,
      6,
    );
  });

  it("reads a right-to-left line by each glyph's own reach, so its first (rightmost) glyph's swash counts", () => {
    // visual order mirrors the logical one: 'T' sits at the RIGHT edge, crossbar reaching past it
    const text = new FabricText('To', {
      fontFamily: FAMILY,
      fontSize: FONT_SIZE,
      direction: 'rtl',
    });
    const overhang = text.getGlyphOverhang();
    expect(overhang.horizontal).toBeCloseTo(
      (INK.T.right - INK.T.width) * SCALE,
      5,
    );
  });

  it('adds half the stroke width to every side', () => {
    const plain = makeText('Lo');
    const stroked = makeText('Lo', { stroke: 'red', strokeWidth: 6 });
    expect(stroked.getGlyphOverhang().horizontal).toBe(
      plain.getGlyphOverhang().horizontal + 3,
    );
  });

  it('is 0 for text on a path', () => {
    const text = makeText('Lo');
    const pathText = makeText('Lo', {
      path: new Path('M 0 0 L 500 0'),
    });
    expect(text.getGlyphOverhang().horizontal).toBeGreaterThan(0);
    expect(pathText.getGlyphOverhang()).toEqual({ horizontal: 0, vertical: 0 });
  });

  it('forgets the overhang with the other layout caches', () => {
    const text = makeText('Lo');
    expect(text.getGlyphOverhang().horizontal).toBeGreaterThan(0);
    text.set({ text: 'oo' });
    text.initDimensions();
    expect(text.getGlyphOverhang().horizontal).toBe(0);
  });

  it('widens the text cache canvas by twice the reach once it exceeds the font size floor', () => {
    const swash = makeText('Lo');
    const fitting = makeText('oo');
    const swashDims = swash._getCacheCanvasDimensions();
    const extra =
      (swashDims.width - fitting._getCacheCanvasDimensions().width) /
      swashDims.zoomX;
    // both boxes are 400 wide; the floor adds fontSize (40), the swash needs 2 × 30 = 60
    expect(extra).toBeCloseTo(60 - FONT_SIZE, 6);
  });

  it('widens a group cache that caters for text children by the same reach', () => {
    const swashGroup = new Group([makeText('Lo')], {
      caterCacheForTextChildren: true,
    });
    const fittingGroup = new Group([makeText('oo')], {
      caterCacheForTextChildren: true,
    });
    const swashDims = swashGroup._getCacheCanvasDimensions();
    const extra =
      (swashDims.width - fittingGroup._getCacheCanvasDimensions().width) /
      swashDims.zoomX;
    expect(extra).toBeCloseTo(60 - FONT_SIZE, 6);
  });

  it('caches the ink bounds next to the widths and clears them together', () => {
    makeText('Lo');
    const style = {
      fontFamily: FAMILY,
      fontStyle: 'normal',
      fontWeight: 'normal',
    };
    expect(cache.getInkCache(style).get('L')).toEqual({
      left: 300,
      right: 200,
      ascent: 280,
      descent: 0,
    });
    cache.clearFontCache(FAMILY);
    expect(cache.getInkCache(style).size).toBe(0);
  });
});
