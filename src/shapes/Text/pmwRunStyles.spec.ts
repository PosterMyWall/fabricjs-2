import { describe, expect, it } from 'vitest';
import { IText } from '../IText/IText';
import { styleProperties } from './constants';
import { FabricText } from './Text';

describe('pmwRunStyles passenger', () => {
  it('is a registered style property', () => {
    expect(styleProperties).toContain('pmwRunStyles');
  });

  it('round-trips through set/getSelectionStyles and clears via undefined', () => {
    const text = new FabricText('abcd');
    text.setSelectionStyles({ pmwRunStyles: { isBold: true } }, 1, 3);
    const [before, inside] = text.getSelectionStyles(0, 3);
    expect(before.pmwRunStyles).toBeUndefined();
    expect(inside.pmwRunStyles).toEqual({ isBold: true });

    text.setSelectionStyles({ pmwRunStyles: undefined }, 1, 2);
    const [cleared, kept] = text.getSelectionStyles(1, 3);
    expect(Object.hasOwn(cleared, 'pmwRunStyles')).toBe(false);
    expect(kept.pmwRunStyles).toEqual({ isBold: true });
  });

  it('survives toObject/fromObject with distinct adjacent runs intact', async () => {
    const text = new FabricText('abcd');
    text.setSelectionStyles({ pmwRunStyles: { run: 1 } }, 1, 2);
    text.setSelectionStyles({ pmwRunStyles: { run: 2 } }, 2, 3);

    const serialized = text.toObject();
    expect(serialized.styles).toHaveLength(2);

    const restored = await FabricText.fromObject(serialized);
    const [first, second] = restored.getSelectionStyles(1, 3);
    expect(first.pmwRunStyles).toEqual({ run: 1 });
    expect(second.pmwRunStyles).toEqual({ run: 2 });
    expect(first.pmwRunStyles).not.toBe(second.pmwRunStyles);
  });

  it('shifts with the text through insertChars and removeChars', () => {
    const text = new IText('abcd');
    text.setSelectionStyles({ pmwRunStyles: { run: 'x' } }, 1, 3);

    text.insertChars('ZZ', undefined, 1);
    expect(text.text).toBe('aZZbcd');
    const stylesAfterInsert = text.getSelectionStyles(0, text.text.length);
    expect(
      stylesAfterInsert.map((style) => style.pmwRunStyles?.run ?? null),
    ).toEqual([null, null, null, 'x', 'x', null]);

    text.removeChars(0, 1);
    expect(text.text).toBe('ZZbcd');
    const stylesAfterRemove = text.getSelectionStyles(0, text.text.length);
    expect(
      stylesAfterRemove.map((style) => style.pmwRunStyles?.run ?? null),
    ).toEqual([null, null, 'x', 'x', null]);
  });
});
