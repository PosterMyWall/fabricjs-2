import { describe, expect, it, vi } from 'vitest';
import { IText } from '../IText/IText';
import { Textbox } from '../Textbox';
import { FabricText } from './Text';
import { Gradient } from '../../gradient/Gradient';
import { createCanvasElement } from '../../util/misc/dom';
import { FabricError } from '../../util/internals/console';

describe('per-line styles (lineStyles)', () => {
  it('overrides alignment for a single line via the offset resolver', () => {
    const text = new FabricText('short\nmuch much longer line', {
      textAlign: 'left',
      fontSize: 20,
    });
    const before = text._getLineLeftOffset(0);
    expect(before).toBe(0);
    text.setLineAlignment(0, 'right');
    const after = text._getLineLeftOffset(0);
    expect(after).toBeGreaterThan(0);
    expect(text._getLineLeftOffset(1)).toBe(0);
    expect(text.getLineAlignment(0)).toBe('right');
    expect(text.getLineAlignment(1)).toBe('left');
  });

  it('clears an alignment override and keeps passenger keys', () => {
    const text = new FabricText('a\nb');
    text.set('lineStyles', {
      0: { textAlign: 'center', pmwList: { marker: '1.' } },
    });
    text.setLineAlignment(0, undefined);
    expect(text.lineStyles[0].textAlign).toBeUndefined();
    expect(text.lineStyles[0].pmwList).toEqual({ marker: '1.' });
  });

  it('applies leftIndent as an extra line offset', () => {
    const text = new FabricText('indented\nplain', {
      textAlign: 'left',
      fontSize: 20,
    });
    text.set('lineStyles', { 0: { leftIndent: 25 } });
    expect(text._getLineLeftOffset(0)).toBe(25);
    expect(text._getLineLeftOffset(1)).toBe(0);
  });

  it('setSelectionAlignment maps graphemes to real lines', () => {
    const text = new FabricText('aaa\nbbb\nccc');
    text.setSelectionAlignment(5, 10, 'center'); // touches lines 1 and 2
    expect(text.getLineAlignment(0)).toBe('left');
    expect(text.getLineAlignment(1)).toBe('center');
    expect(text.getLineAlignment(2)).toBe('center');
  });

  it('keys by real line in a wrapped Textbox: every visual line of the real line aligns', () => {
    const textbox = new Textbox('one two three four five\nnext', {
      width: 80,
      fontSize: 20,
      textAlign: 'left',
    });
    expect(textbox._textLines.length).toBeGreaterThan(2);
    textbox.setLineAlignment(0, 'right');
    const lastVisualOfFirstReal = textbox._textLines.length - 2;
    expect(textbox._getRealLineIndex(lastVisualOfFirstReal)).toBe(0);
    expect(textbox._getLineLeftOffset(lastVisualOfFirstReal)).toBeGreaterThan(
      0,
    );
    const nextLineVisual = textbox._textLines.length - 1;
    expect(textbox._getRealLineIndex(nextLineVisual)).toBe(1);
    expect(textbox._getLineLeftOffset(nextLineVisual)).toBe(0);
  });

  it('round-trips through toObject/fromObject', async () => {
    const text = new FabricText('a\nb');
    text.set('lineStyles', {
      1: { textAlign: 'center', pmwList: { style: 'circle' } },
    });
    const restored = await FabricText.fromObject(text.toObject());
    expect(restored.lineStyles).toEqual({
      1: { textAlign: 'center', pmwList: { style: 'circle' } },
    });
  });

  it('Enter splits: both halves keep the split line record, later lines shift', () => {
    const text = new IText('first\nsecond\nthird');
    text.set('lineStyles', {
      1: { textAlign: 'center', pmwList: { n: 1 } },
      2: { textAlign: 'right' },
    });
    // split line 1 ("second") after "sec" → grapheme index: 6 (line0+\n) + 3
    text.insertChars('\n', undefined, 9);
    expect(text.lineStyles[1]).toEqual({
      textAlign: 'center',
      pmwList: { n: 1 },
    });
    expect(text.lineStyles[2]).toEqual({
      textAlign: 'center',
      pmwList: { n: 1 },
    });
    expect(text.lineStyles[2]).not.toBe(text.lineStyles[1]);
    expect(text.lineStyles[3]).toEqual({ textAlign: 'right' });
  });

  it('Backspace merge: removed line styles vanish, survivor keeps its own, later lines shift up', () => {
    const text = new IText('first\nsecond\nthird');
    text.set('lineStyles', {
      0: { textAlign: 'center' },
      1: { textAlign: 'right', pmwList: { n: 1 } },
      2: { leftIndent: 10 },
    });
    // delete the newline between line 0 and line 1 (grapheme 5)
    text.removeChars(5, 6);
    expect(text.lineStyles[0]).toEqual({ textAlign: 'center' });
    expect(text.lineStyles[1]).toEqual({ leftIndent: 10 });
    expect(text.lineStyles[2]).toBeUndefined();
  });

  it('multi-line delete collapses the range onto the first line', () => {
    const text = new IText('aaa\nbbb\nccc\nddd');
    text.set('lineStyles', {
      1: { textAlign: 'center' },
      2: { textAlign: 'right' },
      3: { leftIndent: 5 },
    });
    // remove from middle of line 1 to middle of line 2
    text.removeChars(5, 10);
    expect(text.lineStyles[1]).toEqual({ textAlign: 'center' });
    expect(text.lineStyles[2]).toEqual({ leftIndent: 5 });
    expect(text.lineStyles[3]).toBeUndefined();
  });

  it('a per-line override excludes the line from justify space enlargement', () => {
    const spaceWidths = (lineStyles: Record<number, object>) => {
      const tb = new Textbox('aa bb cc\ndd ee', {
        width: 300,
        fontSize: 20,
        textAlign: 'justify',
        lineStyles,
      } as never);
      // measurement is lazy for fixed-width boxes; force it as rendering would
      tb.getLineWidth(0);
      return tb.__charBounds[0]
        .filter((_, i) => tb._textLines[0][i] === ' ')
        .map((b) => b.width);
    };
    const justified = spaceWidths({});
    const overridden = spaceWidths({ 0: { textAlign: 'left' } });
    expect(Math.max(...justified)).toBeGreaterThan(Math.max(...overridden));
  });

  it('prunes styles of removed lines in _removeExtraneousStyles', () => {
    const textbox = new Textbox('aaa\nbbb', { width: 200 });
    textbox.set('lineStyles', {
      0: { textAlign: 'center' },
      1: { textAlign: 'right' },
    });
    textbox.set('text', 'aaa');
    textbox._removeExtraneousStyles();
    expect(textbox.lineStyles[0]).toEqual({ textAlign: 'center' });
    expect(textbox.lineStyles[1]).toBeUndefined();
  });
});

describe('per-line list markers', () => {
  it('indents a marker line to the em-factor floor when the marker fits inside it', () => {
    const text = new FabricText('item one\nplain', { fontSize: 20 });
    text.set('lineStyles', { 0: { listMarker: '1.' } });
    const markerWidth = text._measureListMarkerWidth(0);
    expect(markerWidth).toBeGreaterThan(0);
    // sanity: '1.' at 20px is a fraction of the font size, not a CACHE_FONT_SIZE-scale value
    expect(markerWidth).toBeLessThan(40);
    // the marker plus its gap fits the floor, so the floor is what the row reserves
    expect(markerWidth + 0.25 * 20).toBeLessThan(1.25 * 20);
    expect(text._getRealLineIndent(0)).toBeCloseTo(1.25 * 20, 5);
    expect(text._getLineLeftOffset(0)).toBeCloseTo(1.25 * 20, 5);
    expect(text._getLineLeftOffset(1)).toBe(0);
  });

  it('gives two boxes of the same font size the same gutter, whatever their markers', () => {
    const gutterFor = (listMarker: string) => {
      const tb = new Textbox('add your text', {
        width: 300,
        fontSize: 20,
        lineStyles: { 0: { listMarker } },
      } as never);
      return tb._getRealLineIndent(0);
    };
    // a bullet box and a numbered box start their text at the identical column
    expect(gutterFor('1.')).toBeCloseTo(gutterFor('A.'), 5);
    expect(gutterFor('1.')).toBeCloseTo(1.25 * 20, 5);
  });

  it('scales the shared gutter with the largest marker row font size', () => {
    const indentsWithStyles = (styles: object) => {
      const tb = new Textbox('a\nb', {
        width: 300,
        fontSize: 20,
        lineStyles: { 0: { listMarker: '1.' }, 1: { listMarker: '2.' } },
        styles,
      } as never);
      return [tb._getRealLineIndent(0), tb._getRealLineIndent(1)];
    };
    expect(indentsWithStyles({})[0]).toBeCloseTo(1.25 * 20, 5);
    // a marker inherits its line's first character style, so a bigger row lifts the shared gutter
    const mixed = indentsWithStyles({ 1: { 0: { fontSize: 40 } } });
    expect(mixed[0]).toBeCloseTo(1.25 * 40, 5);
    expect(mixed[1]).toBeCloseTo(1.25 * 40, 5);
  });

  it('an explicit leftIndent is reserved as-is, bypassing the auto gutter and its floor', () => {
    const text = new FabricText('item one', { fontSize: 20 });
    text.set('lineStyles', { 0: { listMarker: '1.', leftIndent: 33 } });
    expect(text._getRealLineReservedWidth(0)).toBe(33);
    text.set('lineStyles', { 0: { leftIndent: 7 } });
    expect(text._getRealLineReservedWidth(0)).toBe(7);
    expect(text._getRealLineIndent(0)).toBe(7);
  });

  it('a migrated list row draws at the legacy measured column while reserving its explicit width', () => {
    // migration estimates the legacy gutter (here deliberately far off: 60); the legacy
    // renderer measured its widest marker live and put the text one gap right of it
    const text = 'add your text now\nsecond item';
    const fontSize = 20;
    const reserved = 60;
    const mk = (textAlign: string) =>
      new Textbox(text, {
        width: 300,
        fontSize,
        textAlign,
        lineStyles: {
          0: { listMarker: '1.', leftIndent: reserved },
          1: { listMarker: '2.', leftIndent: reserved },
        },
      } as never);
    const left = mk('left');
    const legacyColumn =
      Math.max(
        left._measureListMarkerWidth(0),
        left._measureListMarkerWidth(1),
      ) +
      0.25 * fontSize;
    expect(legacyColumn).toBeLessThan(reserved);
    expect(left._getRealLineIndent(0)).toBeCloseTo(legacyColumn, 6);
    expect(left._getRealLineIndent(1)).toBeCloseTo(legacyColumn, 6);
    expect(left._getRealLineReservedWidth(0)).toBe(reserved);
    expect(left._getLineLeftOffset(0)).toBeCloseTo(legacyColumn, 6);
    // the wrap is the legacy text area: width − reserved, not width − drawn
    const plain = new Textbox(text, { width: 300 - reserved, fontSize });
    expect(left.textLines).toEqual(plain.textLines);
    // centering distributes the RESERVED free space around the drawn column
    const centered = mk('center');
    expect(centered._getLineLeftOffset(0)).toBeCloseTo(
      legacyColumn + (300 - reserved - centered.getLineWidth(0)) / 2,
      6,
    );
    const righted = mk('right');
    expect(righted._getLineLeftOffset(0)).toBeCloseTo(
      legacyColumn + (300 - reserved - righted.getLineWidth(0)),
      6,
    );
  });

  it('reserves the indent from the wrap width of list rows only', () => {
    const mk = (lineStyles: Record<number, object>) => {
      const tb = new Textbox('several words that need wrapping\nplain line', {
        width: 160,
        fontSize: 20,
        lineStyles,
      } as never);
      return tb._textLines.length;
    };
    const plain = mk({});
    const indented = mk({ 0: { leftIndent: 60 } });
    expect(indented).toBeGreaterThan(plain);
  });

  it('keeps reserving the indent when the widest word fills the text area', () => {
    // A legacy list whose box width was its widest word: the minimum box width
    // (widest word + indent) must not become the wrap cap of later rows.
    const text =
      'add your text\nsadasdsadadd your text\nsadasdsadadd your text';
    const plain = new Textbox(text, { width: 245.2996, fontSize: 36.4 });
    const textArea = plain.width;
    const indent = 95.732;
    const indented = new Textbox(text, {
      width: textArea + indent,
      fontSize: 36.4,
      lineStyles: {
        0: { listMarker: 'I.', leftIndent: indent },
        1: { listMarker: 'II.', leftIndent: indent },
        2: { listMarker: 'III.', leftIndent: indent },
      },
    } as never);
    expect(indented.textLines).toEqual(plain.textLines);
    expect(indented.width).toBeCloseTo(textArea + indent, 6);
  });

  it('justify enlarges spaces only up to the width left of the marker gutter', () => {
    const mk = (lineStyles: Record<number, object>) => {
      const tb = new Textbox(
        'add your text and even more words that must wrap',
        {
          width: 160,
          fontSize: 20,
          textAlign: 'justify',
          lineStyles,
        } as never,
      );
      tb.getLineWidth(0);
      const lastLine = tb._textLines.length - 1;
      // widest justified row: its glyph extent plus the row's indent must stay inside the box
      let maxRight = 0;
      for (let i = 0; i < lastLine; i++) {
        const bounds = tb.__charBounds[i];
        const lastChar = bounds[bounds.length - 1];
        const indent = tb._getRealLineIndent(tb._getRealLineIndex(i));
        maxRight = Math.max(maxRight, indent + lastChar.left + lastChar.width);
      }
      return maxRight;
    };
    const plain = mk({});
    expect(plain).toBeGreaterThan(0);
    expect(plain).toBeLessThanOrEqual(160 + 0.001);
    const listed = mk({ 0: { listMarker: '•' } });
    expect(listed).toBeGreaterThan(0);
    expect(listed).toBeLessThanOrEqual(160 + 0.001);
  });

  it('centers and right-aligns the marker+text unit inside the box', () => {
    const mk = (textAlign: string, lineStyles: Record<number, object>) => {
      const tb = new Textbox('add your text', {
        width: 300,
        fontSize: 20,
        textAlign,
        lineStyles,
      } as never);
      const lineWidth = tb.getLineWidth(0);
      const textStart = tb._getLineLeftOffset(0);
      const indent = tb._getRealLineIndent(0);
      return {
        unitLeft: textStart - indent,
        unitRight: textStart + lineWidth,
        width: tb.width,
      };
    };
    const centered = mk('center', { 0: { listMarker: '•' } });
    // equal margins either side of the marker+text unit
    expect(centered.unitLeft).toBeCloseTo(
      centered.width - centered.unitRight,
      3,
    );
    expect(centered.unitRight).toBeLessThanOrEqual(centered.width + 0.001);
    const righted = mk('right', { 0: { listMarker: '•' } });
    // text flush with the right edge, marker inside the box
    expect(righted.unitRight).toBeCloseTo(righted.width, 3);
    expect(righted.unitLeft).toBeGreaterThanOrEqual(-0.001);
  });

  it('all auto list rows share one gutter: the em floor, widened by a marker that overflows it', () => {
    const tb = new Textbox('a\nb\nc', {
      width: 300,
      fontSize: 20,
      lineStyles: {
        0: { listMarker: '9.' },
        1: { listMarker: '10.' },
        2: { listMarker: '•' },
      },
    } as never);
    const indents = [0, 1, 2].map((line) => tb._getRealLineIndent(line));
    // one shared text column for every row, wide enough for the widest marker
    expect(indents[0]).toBe(indents[1]);
    expect(indents[1]).toBe(indents[2]);
    expect(indents[0]).toBeGreaterThanOrEqual(tb._measureListMarkerWidth(1));
    // never below the floor, and here '10.' overflows the floor so the measured width wins
    expect(indents[0]).toBeGreaterThanOrEqual(1.25 * 20);
    expect(indents[0]).toBeCloseTo(
      tb._measureListMarkerWidth(1) + 0.25 * 20,
      5,
    );
    // explicit legacy indents stay their own and don't join the shared gutter
    tb.set('lineStyles', {
      ...tb.lineStyles,
      1: { listMarker: '10.', leftIndent: 77 },
    });
    expect(tb._getRealLineReservedWidth(1)).toBe(77);
    expect(tb._getRealLineIndent(1)).toBeCloseTo(
      tb._measureListMarkerWidth(1) + 0.25 * 20,
      5,
    );
    expect(tb._getRealLineIndent(0)).toBeLessThan(77);
  });

  it('markers right-align in the gutter: ordinal periods line up, digits grow left', () => {
    const tb = new Textbox('a\nb', {
      width: 300,
      fontSize: 20,
      lineStyles: { 0: { listMarker: '9.' }, 1: { listMarker: '10.' } },
    } as never);
    const canvas = createCanvasElement();
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const fillTextCalls: [string, number, number][] = [];
    const originalFillText = ctx.fillText.bind(ctx);
    ctx.fillText = ((textStr: string, x: number, y: number): void => {
      fillTextCalls.push([textStr, x, y]);
      originalFillText(textStr, x, y);
    }) as typeof ctx.fillText;
    ctx.save();
    ctx.translate(200, 100);
    tb._render(ctx);
    ctx.restore();
    const nine = fillTextCalls.find(([t]) => t === '9.');
    const ten = fillTextCalls.find(([t]) => t === '10.');
    if (!nine || !ten) {
      throw new FabricError('markers not rendered');
    }
    const nineRight = nine[1] + tb._measureListMarkerWidth(0);
    const tenRight = ten[1] + tb._measureListMarkerWidth(1);
    expect(nineRight).toBeCloseTo(tenRight, 3);
    expect(ten[1]).toBeLessThan(nine[1]);
  });

  it('unordered markers draw raised by fontSize/16 like the legacy bullets textbox; ordered sit on the baseline', () => {
    const tb = new Textbox('aa\nbb', {
      width: 300,
      fontSize: 20,
      lineStyles: {
        0: {
          listMarker: 'X',
          listMarkerFontFamily: 'bullets',
          pmwLineStyles: {},
        },
        1: { listMarker: '1.', pmwLineStyles: {} },
      },
    });
    tb.initDimensions();
    const canvas = createCanvasElement();
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const fillTextCalls: [string, number, number][] = [];
    const originalFillText = ctx.fillText.bind(ctx);
    ctx.fillText = ((textStr: string, x: number, y: number): void => {
      fillTextCalls.push([textStr, x, y]);
      originalFillText(textStr, x, y);
    }) as typeof ctx.fillText;
    ctx.save();
    ctx.translate(200, 100);
    tb._render(ctx);
    ctx.restore();
    const bulletMarker = fillTextCalls.find(([t]) => t === 'X');
    const orderedMarker = fillTextCalls.find(([t]) => t === '1.');
    // unstyled rows render as one fillText per line
    const rowZeroChar = fillTextCalls.find(([t]) => t.includes('a'));
    const rowOneChar = fillTextCalls.find(([t]) => t.includes('b'));
    if (!bulletMarker || !orderedMarker || !rowZeroChar || !rowOneChar) {
      throw new FabricError('markers or text not rendered');
    }
    expect(bulletMarker[2]).toBeCloseTo(rowZeroChar[2] - 20 / 16, 3);
    expect(orderedMarker[2]).toBeCloseTo(rowOneChar[2], 3);
  });

  it('rtl rows keep their text offsets and draw the marker in the RIGHT gutter', () => {
    // PMW never sets direction:'rtl' today — this pins the mirror semantics for when it does:
    // the gutter is reserved on the right, text offsets match upstream's rtl values, and the
    // marker draws right of the text's anchor (its right edge under rtl).
    const tb = new Textbox('word', {
      width: 300,
      fontSize: 20,
      direction: 'rtl',
      textAlign: 'right',
      lineStyles: { 0: { listMarker: '1.' } },
    } as never);
    const lineWidth = tb.getLineWidth(0);
    const indent = tb._getRealLineIndent(0);
    // right-aligned (rtl's natural side): text inset from the right edge by the gutter
    expect(tb._getLineLeftOffset(0)).toBeCloseTo(-indent, 3);
    // explicit left alignment: flush left, the gutter stays on the right (reserved from wrap)
    tb.set('lineStyles', { 0: { listMarker: '1.', textAlign: 'left' } });
    expect(tb._getLineLeftOffset(0)).toBeCloseTo(-(tb.width - lineWidth), 3);

    const canvas = createCanvasElement();
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const fillTextCalls: [string, number, number][] = [];
    const originalFillText = ctx.fillText.bind(ctx);
    ctx.fillText = ((textStr: string, x: number, y: number): void => {
      fillTextCalls.push([textStr, x, y]);
      originalFillText(textStr, x, y);
    }) as typeof ctx.fillText;
    ctx.save();
    ctx.translate(200, 100);
    tb._render(ctx);
    ctx.restore();
    const markerCall = fillTextCalls.find(([t]) => t === '1.');
    const textCall = fillTextCalls.find(([t]) => t !== '1.');
    if (!markerCall || !textCall) {
      throw new FabricError('marker or text not rendered');
    }
    // under rtl the text call's x is its RIGHT edge; the marker must start right of it
    expect(markerCall[1]).toBeGreaterThan(textCall[1]);
  });

  it('renders the marker once per real line, in the gutter, with the marker style', () => {
    const tb = new Textbox('wrapping words here we go\nplain', {
      width: 140,
      fontSize: 20,
      lineStyles: { 0: { listMarker: '•', listMarkerFill: 'rgb(255, 0, 0)' } },
    } as never);
    expect(tb._textLines.length).toBeGreaterThan(2);
    const canvas = createCanvasElement();
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const fillTextCalls: [string, number, number][] = [];
    const originalFillText = ctx.fillText.bind(ctx);
    ctx.fillText = ((textStr: string, x: number, y: number): void => {
      fillTextCalls.push([textStr, x, y]);
      originalFillText(textStr, x, y);
    }) as typeof ctx.fillText;
    ctx.save();
    ctx.translate(150, 100);
    tb._render(ctx);
    ctx.restore();
    const markerCalls = fillTextCalls.filter(([textStr]) => textStr === '•');
    expect(markerCalls).toHaveLength(1);
    // the list line's own first row starts right of its marker (the plain line may share the gutter x)
    const firstRowCall = fillTextCalls.find(([textStr]) => textStr !== '•');
    if (!firstRowCall) {
      throw new FabricError('no text row rendered');
    }
    expect(firstRowCall[1]).toBeGreaterThan(markerCalls[0][1]);
  });

  it("colors the marker from a gradient fill's lowest-offset stop when no explicit marker fill exists", () => {
    const boxGradient = new Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: 0, y2: 40 },
      colorStops: [
        { offset: 0.5, color: 'rgb(10, 20, 30)' },
        { offset: 1, color: 'rgb(200, 100, 0)' },
      ],
    });
    const tb = new Textbox('item', {
      width: 200,
      fontSize: 20,
      fill: boxGradient,
      lineStyles: { 0: { listMarker: '•' } },
    } as never);
    expect(tb._getListMarkerStyle(0).fill).toBe('rgb(10, 20, 30)');

    // a per-char gradient on the line's first character wins over the box gradient,
    // and the FIRST color is the lowest OFFSET, not array order
    const charGradient = new Gradient({
      type: 'radial',
      coords: { x1: 0, y1: 0, x2: 0, y2: 0, r1: 0, r2: 20 },
      colorStops: [
        { offset: 1, color: 'rgb(9, 9, 9)' },
        { offset: 0, color: 'rgb(1, 2, 3)' },
      ],
    });
    tb.styles = { 0: { 0: { fill: charGradient } } } as never;
    expect(tb._getListMarkerStyle(0).fill).toBe('rgb(1, 2, 3)');

    // an explicit marker fill still overrides every gradient
    tb.set('lineStyles', {
      0: { listMarker: '•', listMarkerFill: 'rgb(255, 0, 0)' },
    });
    expect(tb._getListMarkerStyle(0).fill).toBe('rgb(255, 0, 0)');
  });

  it('marker records shift with their lines through editing', () => {
    const text = new IText('aaa\nitem\nccc');
    text.set('lineStyles', {
      1: { listMarker: '•', pmwLineStyles: { list: { style: 'circle-1' } } },
    });
    text.insertChars('\n', undefined, 3);
    expect(text.lineStyles[2]?.listMarker).toBe('•');
    expect(text.lineStyles[1]?.listMarker).toBeUndefined();
    text.removeChars(3, 4);
    expect(text.lineStyles[1]?.listMarker).toBe('•');
  });
  it('measures each marker once per layout: a render of many list rows stays linear', () => {
    const rows = 40;
    const tb = new Textbox(
      Array.from({ length: rows }, (_, i) => `row ${i}`).join('\n'),
      {
        width: 300,
        fontSize: 20,
        lineStyles: Object.fromEntries(
          Array.from({ length: rows }, (_, i) => [
            i,
            { listMarker: `${i + 1}.` },
          ]),
        ),
      } as never,
    );
    const measureMarker = vi.spyOn(tb, '_computeListMarkerWidth');
    const canvas = createCanvasElement();
    canvas.width = 400;
    canvas.height = 2000;
    tb.initDimensions();
    tb.render(canvas.getContext('2d')!);
    // one measurement per marker for layout plus render together, not one per row per visual line
    expect(measureMarker).toHaveBeenCalledTimes(rows);
    measureMarker.mockClear();

    // the memo is per layout: a first-character style change invalidates it
    tb.setSelectionStyles({ fontSize: 40 }, 0, 1);
    const before = tb._getRealLineIndent(0);
    tb.initDimensions();
    expect(tb._getRealLineIndent(0)).toBeGreaterThan(before);
    expect(measureMarker).toHaveBeenCalledTimes(rows);
    measureMarker.mockRestore();
  });
});
