import { describe, expect, it } from 'vitest';
import { cloneStyles } from '../internals/cloneStyles';
import { hasStyleChanged, stylesFromArray, stylesToArray } from './textStyles';

describe('hasStyleChanged', () => {
  const base = { fill: 'red', fontSize: 20 };

  it('splits ranges on squigglyline for text spans', () => {
    expect(
      hasStyleChanged({ ...base }, { ...base, squigglyline: true }, true),
    ).toBe(true);
    expect(
      hasStyleChanged({ ...base }, { ...base, squigglyline: true }, false),
    ).toBe(false);
  });

  it('splits ranges on isStrokeForBold for text spans', () => {
    expect(
      hasStyleChanged({ ...base }, { ...base, isStrokeForBold: true }, true),
    ).toBe(true);
    expect(
      hasStyleChanged({ ...base }, { ...base, isStrokeForBold: true }, false),
    ).toBe(false);
  });

  it('deep-compares pmwRunStyles for text spans', () => {
    const a = { ...base, pmwRunStyles: { isBold: true, fillColor: [1, 2, 3] } };
    const equalOtherRef = {
      ...base,
      pmwRunStyles: { isBold: true, fillColor: [1, 2, 3] },
    };
    const different = {
      ...base,
      pmwRunStyles: { isBold: true, fillColor: [1, 2, 4] },
    };
    expect(hasStyleChanged(a, equalOtherRef, true)).toBe(false);
    expect(hasStyleChanged(a, different, true)).toBe(true);
    expect(hasStyleChanged(a, { ...base }, true)).toBe(true);
    expect(hasStyleChanged(a, different, false)).toBe(false);
  });
});

describe('stylesToArray', () => {
  it('keeps adjacent characters with distinct pmwRunStyles in separate ranges', () => {
    const styles = {
      0: {
        0: { fill: 'red', pmwRunStyles: { run: 1 } },
        1: { fill: 'red', pmwRunStyles: { run: 2 } },
      },
    };
    const array = stylesToArray(styles, 'ab');
    expect(array).toHaveLength(2);
    expect(array[0]).toMatchObject({ start: 0, end: 1 });
    expect(array[1]).toMatchObject({ start: 1, end: 2 });
  });

  it('merges adjacent characters whose pmwRunStyles are deep-equal', () => {
    const styles = {
      0: {
        0: { fill: 'red', pmwRunStyles: { run: 1 } },
        1: { fill: 'red', pmwRunStyles: { run: 1 } },
      },
    };
    const array = stylesToArray(styles, 'ab');
    expect(array).toHaveLength(1);
    expect(array[0]).toMatchObject({ start: 0, end: 2 });
  });
});

describe('stylesFromArray', () => {
  it('gives every character its own deep copy of nested values', () => {
    const source = [
      { start: 0, end: 2, style: { pmwRunStyles: { colors: [1, 2] } } },
    ];
    const styles = stylesFromArray(source, 'ab');
    const first = styles[0][0].pmwRunStyles as { colors: number[] };
    const second = styles[0][1].pmwRunStyles as { colors: number[] };
    expect(first).toEqual(second);
    first.colors.push(3);
    expect(second.colors).toEqual([1, 2]);
    expect(source[0].style.pmwRunStyles.colors).toEqual([1, 2]);
  });
});

describe('cloneStyles', () => {
  it('deep-copies nested declaration values', () => {
    const styles = {
      0: { 0: { pmwRunStyles: { outline: { width: 2 } } } },
    };
    const cloned = cloneStyles(styles);
    (
      cloned[0][0].pmwRunStyles as { outline: { width: number } }
    ).outline.width = 9;
    expect(
      (styles[0][0].pmwRunStyles as { outline: { width: number } }).outline
        .width,
    ).toBe(2);
  });
});
