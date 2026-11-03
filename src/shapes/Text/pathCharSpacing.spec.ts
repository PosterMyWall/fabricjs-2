import { describe, expect, it, vi } from 'vitest';
import { FabricText } from './Text';
import { Path } from '../Path';
import { createCanvasElement } from '../../util/misc/dom';

/**
 * *PMW* A letter on a path with letter spacing: the glyph's own ink is centred where its box's
 * middle meets the path and drawn centred on that anchor, so a spaced letter sits on the curve.
 * Before, the box (the glyph plus the spacing after it) was centred and the glyph drawn from the
 * box's start, half a spacing before the anchor along the tangent: off the curve for any real
 * spacing, and far off it round a square's corner.
 */
describe('char spacing on a path', () => {
  const CHAR_SPACING = 100;

  const makeTextOnLine = (charSpacing: number) => {
    const path = new Path('M 0 0 L 1000 0');
    const text = new FabricText('ab', { path, charSpacing, fontSize: 40 });
    text.initDimensions();
    // A path layout fills the char boxes on the first measure, not in initDimensions.
    text.getLineWidth(0);
    return text;
  };

  it('anchors each glyph at the middle of its own ink along the path, the spacing after it', () => {
    const plainBoxes = makeTextOnLine(0).__charBounds[0];
    const spacedBoxes = makeTextOnLine(CHAR_SPACING).__charBounds[0];

    // The first glyph starts the path either way, so its ink's middle is half its own width in.
    expect(spacedBoxes[0].renderLeft).toBeCloseTo(plainBoxes[0].renderLeft!, 5);
    // The second starts one spacing later.
    expect(spacedBoxes[1].renderLeft).toBeCloseTo(
      plainBoxes[1].renderLeft! + CHAR_SPACING,
      5,
    );
  });

  it('draws each glyph centred on its anchor: half its own width back, not half its box', () => {
    const text = makeTextOnLine(CHAR_SPACING);
    const lefts: number[] = [];
    const renderChar = vi
      .spyOn(text, '_renderChar')
      .mockImplementation(
        (_method, _ctx, _lineIndex, _charIndex, _char, left) => {
          lefts.push(left);
        },
      );
    const ctx = createCanvasElement().getContext('2d')!;

    text._renderChars('fillText', ctx, text._textLines[0], 0, 0, 0);

    const boxes = text.__charBounds[0];
    expect(lefts).toHaveLength(2);
    expect(lefts[0]).toBeCloseTo(-(boxes[0].width - CHAR_SPACING) / 2, 5);
    expect(lefts[1]).toBeCloseTo(-(boxes[1].width - CHAR_SPACING) / 2, 5);
    renderChar.mockRestore();
  });
});
