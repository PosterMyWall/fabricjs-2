import { describe, expect, it, vi } from 'vitest';
import { FabricText } from './Text';

type Rect = { x: number; y: number; w: number; h: number };

/** `devicePixelsPerUnit` plays the context transform: object scale × zoom × device pixel ratio. */
const drawSquiggle = (
  fontSize: number,
  width = 90,
  devicePixelsPerUnit = 1,
): Rect[] => {
  const rects: Rect[] = [];
  const ctx = {
    fillRect: vi.fn((x: number, y: number, w: number, h: number) =>
      rects.push({ x, y, w, h }),
    ),
    getTransform: () => ({ a: devicePixelsPerUnit, b: 0 }),
  } as unknown as CanvasRenderingContext2D;
  const text = new FabricText('x');
  (
    text as unknown as {
      fillTextDecorationRect: (
        ctx: CanvasRenderingContext2D,
        type: string,
        x: number,
        y: number,
        w: number,
        h: number,
        fontSize: number,
      ) => void;
    }
  ).fillTextDecorationRect(ctx, 'squigglyline', 0, 0, width, 1, fontSize);
  return rects;
};

const peak = (rects: Rect[]) => Math.max(...rects.map((r) => r.y));

describe('spell-check squiggle (*PMW*)', () => {
  it('keeps the legacy fixed-pixel geometry at the reference font size', () => {
    const rects = drawSquiggle(45);
    expect(rects[0]).toMatchObject({ w: 2, h: 2 });
    expect(rects.length).toBe(180);
    expect(peak(rects)).toBeCloseTo(6.75, 5);
  });

  it('scales the wave and the dots with the run font size', () => {
    const small = drawSquiggle(11);
    const large = drawSquiggle(90);
    // wave height follows the font size (sampled dots may miss the exact crest by under half a unit)
    expect(peak(small)).toBeCloseTo((6.75 * 11) / 45, 0);
    expect(peak(large)).toBeCloseTo((6.75 * 90) / 45, 0);
    // dot size too, floored at one device pixel so tiny text still shows a line
    expect(small[0].w).toBe(1);
    expect(large[0].w).toBe(4);
    // the dot pitch scales, so the number of dots over a fixed width falls as text grows
    expect(small.length).toBeGreaterThan(large.length);
  });

  it('floors the dot at one DEVICE pixel, not one text unit, so scaled-up small fonts stay thin', () => {
    // a 5.5px font drawn through a 3.46× object scale at 0.9 zoom: ~0.32 text units per device pixel
    const devicePixelsPerUnit = 3.4566 * 0.904;
    const scaledUp = drawSquiggle(5.5, 30, devicePixelsPerUnit);
    expect(scaledUp[0].w).toBeCloseTo(
      Math.max((2 * 5.5) / 45, 1 / devicePixelsPerUnit),
      5,
    );
    // the dot stays well under the wave height instead of swallowing it
    expect(scaledUp[0].w).toBeLessThan(peak(scaledUp) / 2);
    // on a retina screen the floor is half a CSS pixel in text units
    const retina = drawSquiggle(11, 30, 2);
    expect(retina[0].w).toBeCloseTo(Math.max((2 * 11) / 45, 0.5), 5);
  });

  it('is the only decoration that reads the font size', () => {
    const rects: Rect[] = [];
    const ctx = {
      fillRect: vi.fn((x: number, y: number, w: number, h: number) =>
        rects.push({ x, y, w, h }),
      ),
      getTransform: () => ({ a: 1, b: 0 }),
    } as unknown as CanvasRenderingContext2D;
    const text = new FabricText('x');
    (
      text as unknown as {
        fillTextDecorationRect: (...args: unknown[]) => void;
      }
    ).fillTextDecorationRect(ctx, 'underline', 3, 4, 50, 2, 11);
    expect(rects).toEqual([{ x: 3, y: 4, w: 50, h: 2 }]);
  });
});
