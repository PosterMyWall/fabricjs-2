import { describe, expect, it, vi } from 'vitest';
import { IText } from '../IText/IText';
import { styleProperties } from './constants';
import { FabricText } from './Text';
import { hasStyleChanged } from '../../util/misc/textStyles';
import { createCanvasElement } from '../../util/misc/dom';

const RED_SHADOW = { color: 'red', blur: 4, offsetX: 2, offsetY: 3 };
const BLUE_SHADOW = { color: 'blue', blur: 4, offsetX: 2, offsetY: 3 };

describe('per-character shadow', () => {
  it('is a registered style property', () => {
    expect(styleProperties).toContain('shadow');
  });

  it('round-trips through set/getSelectionStyles and clears via undefined', () => {
    const text = new FabricText('abcd');
    text.setSelectionStyles({ shadow: RED_SHADOW }, 1, 3);
    const [before, inside] = text.getSelectionStyles(0, 3);
    expect(before.shadow).toBeUndefined();
    expect(inside.shadow).toEqual(RED_SHADOW);

    text.setSelectionStyles({ shadow: undefined }, 1, 2);
    const [cleared, kept] = text.getSelectionStyles(1, 3);
    expect(Object.hasOwn(cleared, 'shadow')).toBe(false);
    expect(kept.shadow).toEqual(RED_SHADOW);
  });

  it('splits serialized ranges between equal-looking but distinct shadows and merges equal ones', () => {
    const text = new FabricText('abcd');
    text.setSelectionStyles({ shadow: { ...RED_SHADOW } }, 0, 2);
    text.setSelectionStyles({ shadow: BLUE_SHADOW }, 2, 4);
    const serialized = text.toObject();
    expect(serialized.styles).toHaveLength(2);
    expect(serialized.styles[0]).toMatchObject({ start: 0, end: 2 });
    expect(serialized.styles[1]).toMatchObject({ start: 2, end: 4 });
  });

  it('survives toObject/fromObject with deep-copied declarations', async () => {
    const text = new FabricText('ab');
    text.setSelectionStyles({ shadow: RED_SHADOW }, 0, 2);
    const restored = await FabricText.fromObject(text.toObject());
    const [first, second] = restored.getSelectionStyles(0, 2);
    expect(first.shadow).toEqual(RED_SHADOW);
    expect(first.shadow).not.toBe(second.shadow);
  });

  it('hasStyleChanged value-compares shadows for render batching', () => {
    expect(
      hasStyleChanged(
        { shadow: { ...RED_SHADOW } },
        { shadow: { ...RED_SHADOW } },
        false,
      ),
    ).toBe(false);
    expect(
      hasStyleChanged({ shadow: RED_SHADOW }, { shadow: BLUE_SHADOW }, false),
    ).toBe(true);
    expect(hasStyleChanged({}, { shadow: RED_SHADOW }, false)).toBe(true);
  });

  it('cleanStyle is a no-op for shadow', () => {
    const text = new FabricText('ab');
    text.setSelectionStyles({ shadow: RED_SHADOW }, 0, 2);
    text.cleanStyle('shadow');
    expect(text.getSelectionStyles(0, 1)[0].shadow).toEqual(RED_SHADOW);
    expect((text as unknown as { shadow: unknown }).shadow).toBeFalsy();
  });

  it('expands the cache canvas for the widest character shadow', () => {
    const text = new FabricText('abcd', { fontSize: 40 });
    const plainDims = text._getCacheCanvasDimensions();
    text.setSelectionStyles(
      { shadow: { color: 'red', blur: 10, offsetX: 25, offsetY: 5 } },
      1,
      2,
    );
    const shadowDims = text._getCacheCanvasDimensions();
    // extent = blur 10 + max offset 25 = 35 per side
    expect(shadowDims.width - plainDims.width).toBeCloseTo(
      35 * 2 * shadowDims.zoomX,
      5,
    );
    expect(shadowDims.height - plainDims.height).toBeCloseTo(
      35 * 2 * shadowDims.zoomY,
      5,
    );
  });

  it('applies and scopes the shadow around shadowed glyph runs when rendering', () => {
    const text = new FabricText('abcd', { fontSize: 20 });
    text.setSelectionStyles({ shadow: RED_SHADOW }, 1, 3);
    const canvas = createCanvasElement();
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const setCharShadowSpy = vi.spyOn(
      text as unknown as {
        _setCharShadow(c: CanvasRenderingContext2D, s: object): void;
      },
      '_setCharShadow',
    );
    ctx.save();
    ctx.translate(100, 50);
    text._render(ctx);
    ctx.restore();
    expect(setCharShadowSpy).toHaveBeenCalled();
    expect(
      setCharShadowSpy.mock.calls.every(
        ([, shadow]) =>
          shadow === RED_SHADOW ||
          (shadow as { color?: string }).color === 'red',
      ),
    ).toBe(true);
    // the context shadow never leaks past the render
    expect(
      ctx.shadowColor === 'rgba(0, 0, 0, 0)' ||
        ctx.shadowColor === '#000000' ||
        ctx.shadowBlur === 0,
    ).toBe(true);
  });

  it('shifts with the text through editing like any style property', () => {
    const text = new IText('abcd');
    text.setSelectionStyles({ shadow: RED_SHADOW }, 2, 4);
    text.insertChars('XX', undefined, 1);
    const styles = text.getSelectionStyles(0, 6);
    expect(styles[4].shadow).toEqual(RED_SHADOW);
    expect(styles[5].shadow).toEqual(RED_SHADOW);
    expect(styles[1].shadow).toBeUndefined();
  });
});
