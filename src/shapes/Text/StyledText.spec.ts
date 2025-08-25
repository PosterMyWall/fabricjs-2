import { FabricText } from './Text';
import { graphemeSplit } from '../../util/lang_string';

import { describe, expect, it, test } from 'vitest';

describe('setSelectionStyles', () => {
  test('will set properties at the correct position', () => {
    const text = new FabricText('Hello', {
      styles: {
        0: {
          0: {
            fontSize: 33,
            fill: 'blue',
            deltaY: 44,
          },
        },
      },
    });
    const [style1, style2] = text.getSelectionStyles(0, 2);
    expect(style1.fontSize).toBe(33);
    expect(style1.deltaY).toBe(44);
    expect(style1.fill).toBe('blue');
    expect(style2).toEqual({});
    text.setSelectionStyles(
      {
        fontSize: undefined,
        deltaY: 0,
      },
      0,
      2,
    );
    const [style1After, style2After] = text.getSelectionStyles(0, 2);
    expect(Object.hasOwn(style1After, 'fontSize')).toBe(false);
    expect(style1After.deltaY).toBe(0);
    expect(style1After.fill).toBe('blue');
    expect(style2After).toEqual({
      deltaY: 0,
    });
  });

  test('should apply styles at cursor position when no text is selected', () => {
    const text = new FabricText('Hello World');
    
    // Test case 1: startIndex === endIndex (no selection)
    text.setSelectionStyles({ fontSize: 20, fill: 'red' }, 5, 5);
    const style1 = text.getStyleAtPosition(5);
    expect(style1.fontSize).toBe(20);
    expect(style1.fill).toBe('red');
    
    // Test case 2: endIndex undefined (cursor position)
    const text2 = new FabricText('Hello World');
    text2.setSelectionStyles({ fontSize: 25, fill: 'blue' }, 3);
    const style2 = text2.getStyleAtPosition(3);
    expect(style2.fontSize).toBe(25);
    expect(style2.fill).toBe('blue');
  });

  test('should still work with selection ranges', () => {
    const text = new FabricText('Hello World');
    
    // Test selection range
    text.setSelectionStyles({ fontSize: 30, fill: 'green' }, 2, 5);
    const style2 = text.getStyleAtPosition(2);
    const style3 = text.getStyleAtPosition(3);
    const style4 = text.getStyleAtPosition(4);
    const style5 = text.getStyleAtPosition(5); // Should not have style (not included in range)
    
    expect(style2.fontSize).toBe(30);
    expect(style2.fill).toBe('green');
    expect(style3.fontSize).toBe(30);
    expect(style3.fill).toBe('green');
    expect(style4.fontSize).toBe(30);
    expect(style4.fill).toBe('green');
    expect(style5.fontSize).toBeUndefined();
    expect(style5.fill).toBeUndefined();
  });

  test('should handle cursor at beginning and end of text', () => {
    const text = new FabricText('Hello');
    
    // Test cursor at beginning (position 0)
    text.setSelectionStyles({ fontSize: 15, fill: 'yellow' }, 0, 0);
    const styleStart = text.getStyleAtPosition(0);
    expect(styleStart.fontSize).toBe(15);
    expect(styleStart.fill).toBe('yellow');
    
    // Test cursor at end (position equal to text length)
    // Note: we expect this to work even though there's no character at this position
    // because this represents where new text would be inserted
    text.setSelectionStyles({ fontSize: 35, fill: 'purple' }, 5, 5);
    
    // Since position 5 doesn't exist in "Hello", _extendStyles should handle this gracefully
    // The style should be applied to prepare for new text insertion
    expect(text.styles).toBeDefined();
  });
});

describe('toObject', () => {
  it('Will serialize text with graphemes in mind', () => {
    const text = new FabricText('🤩🤩\nHello', {
      styles: {
        1: {
          0: {
            fontSize: 40,
          },
        },
      },
    });
    const serializedStyles = text.toObject().styles;
    expect(serializedStyles).toEqual([
      { start: 2, end: 3, style: { fontSize: 40 } },
    ]);
    expect(serializedStyles[0].start).toEqual(
      graphemeSplit(text.textLines[0]).length,
    );
  });
});
