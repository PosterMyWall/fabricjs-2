import { defineProperty as _defineProperty } from '../../../_virtual/_rollupPluginBabelHelpers.mjs';
import { Canvas } from '../../canvas/Canvas.mjs';
import { ITextClickBehavior } from './ITextClickBehavior.mjs';
import { ctrlKeysMapUp, ctrlKeysMapDown, keysMapRtl, keysMap } from './constants.mjs';
import { classRegistry } from '../../ClassRegistry.mjs';
import { JUSTIFY, JUSTIFY_RIGHT, JUSTIFY_LEFT, JUSTIFY_CENTER } from '../Text/constants.mjs';
import { RIGHT, LEFT, CENTER, FILL } from '../../constants.mjs';
import { createCanvasElementFor } from '../../util/misc/dom.mjs';
import { applyCanvasTransform } from '../../util/internals/applyCanvasTransform.mjs';

// Declare IText protected properties to workaround TS
const protectedDefaultValues = {
  _selectionDirection: null,
  _reSpace: /\s|\r?\n/,
  inCompositionMode: false
};
const iTextDefaultValues = {
  selectionStart: 0,
  selectionEnd: 0,
  selectionColor: 'rgba(17,119,255,0.3)',
  isEditing: false,
  editable: true,
  column: 0,
  dataType: '',
  editingBorderColor: 'rgba(102,153,255,0.25)',
  cursorWidth: 2,
  cursorColor: '',
  cursorDelay: 1000,
  cursorDuration: 600,
  caching: true,
  hiddenTextareaContainer: null,
  keysMap,
  keysMapRtl,
  ctrlKeysMapDown,
  ctrlKeysMapUp,
  ...protectedDefaultValues
};

// @TODO this is not complete

/**
 * @fires changed
 * @fires selection:changed
 * @fires editing:entered
 * @fires editing:exited
 * @fires dragstart
 * @fires drag drag event firing on the drag source
 * @fires dragend
 * @fires copy
 * @fires cut
 * @fires paste
 *
 * #### Supported key combinations
 * ```
 *   Move cursor:                    left, right, up, down
 *   Select character:               shift + left, shift + right
 *   Select text vertically:         shift + up, shift + down
 *   Move cursor by word:            alt + left, alt + right
 *   Select words:                   shift + alt + left, shift + alt + right
 *   Move cursor to line start/end:  cmd + left, cmd + right or home, end
 *   Select till start/end of line:  cmd + shift + left, cmd + shift + right or shift + home, shift + end
 *   Jump to start/end of text:      cmd + up, cmd + down
 *   Select till start/end of text:  cmd + shift + up, cmd + shift + down or shift + pgUp, shift + pgDown
 *   Delete character:               backspace
 *   Delete word:                    alt + backspace
 *   Delete line:                    cmd + backspace
 *   Forward delete:                 delete
 *   Copy text:                      ctrl/cmd + c
 *   Paste text:                     ctrl/cmd + v
 *   Cut text:                       ctrl/cmd + x
 *   Select entire text:             ctrl/cmd + a
 *   Quit editing                    tab or esc
 * ```
 *
 * #### Supported mouse/touch combination
 * ```
 *   Position cursor:                click/touch
 *   Create selection:               click/touch & drag
 *   Create selection:               click & shift + click
 *   Select word:                    double click
 *   Select line:                    triple click
 * ```
 */
class IText extends ITextClickBehavior {
  static getDefaults() {
    return {
      ...super.getDefaults(),
      ...IText.ownDefaults
    };
  }
  get type() {
    const type = super.type;
    // backward compatibility
    return type === 'itext' ? 'i-text' : type;
  }

  /**
   * Constructor
   * @param {String} text Text string
   * @param {Object} [options] Options object
   */
  constructor(text, options) {
    super(text, {
      ...IText.ownDefaults,
      ...options
    });
    this.initBehavior();
  }

  /**
   * While editing handle differently
   * @private
   * @param {string} key
   * @param {*} value
   */
  _set(key, value) {
    if (this.isEditing && this._savedProps && key in this._savedProps) {
      // @ts-expect-error irritating TS
      this._savedProps[key] = value;
      return this;
    }
    if (key === 'canvas') {
      this.canvas instanceof Canvas && this.canvas.textEditingManager.remove(this);
      value instanceof Canvas && value.textEditingManager.add(this);
    }
    return super._set(key, value);
  }

  /**
   * Sets selection start (left boundary of a selection)
   * @param {Number} index Index to set selection start to
   */
  setSelectionStart(index) {
    index = Math.max(index, 0);
    this._updateAndFire('selectionStart', index);
  }

  /**
   * Sets selection end (right boundary of a selection)
   * @param {Number} index Index to set selection end to
   */
  setSelectionEnd(index) {
    index = Math.min(index, this.text.length);
    this._updateAndFire('selectionEnd', index);
  }

  /**
   * @private
   * @param {String} property 'selectionStart' or 'selectionEnd'
   * @param {Number} index new position of property
   */
  _updateAndFire(property, index) {
    if (this[property] !== index) {
      this._fireSelectionChanged();
      this[property] = index;
    }
    this._updateTextarea();
  }

  /**
   * *PMW*
   * Returns location of cursor on canvas
   */
  getCharOffset(position) {
    let topOffset = 0,
      leftOffset = 0;
    const cursorPosition = this.get2DCursorLocation(position),
      charIndex = cursorPosition.charIndex,
      lineIndex = cursorPosition.lineIndex;
    for (let i = 0; i < lineIndex; i++) {
      topOffset += this.getHeightOfLine(i);
    }
    const lineLeftOffset = this._getLineLeftOffset(lineIndex);
    const bound = this.__charBounds[lineIndex][charIndex];
    bound && (leftOffset = bound.left);
    if (this.charSpacing !== 0 && charIndex === this._textLines[lineIndex].length) {
      leftOffset -= this._getWidthOfCharSpacing();
    }
    return {
      x: lineLeftOffset + (leftOffset > 0 ? leftOffset : 0),
      y: topOffset
    };
  }

  /**
   * *PMW*
   * Draws a background for the object big as its untrasformed dimensions
   * @private
   */
  _renderBackground(ctx) {
    if (!this.backgroundColor) {
      return;
    }
    const dim = this._getNonTransformedDimensions();
    let scaleX = this.scaleX,
      scaleY = this.scaleY;
    ctx.fillStyle = this.backgroundColor;
    if (this.group) {
      scaleX *= this.group.scaleX;
      scaleY *= this.group.scaleY;
    }
    ctx.fillRect(-dim.x / 2 - this.padding / scaleX, -dim.y / 2 - this.padding / scaleY, dim.x + this.padding / scaleX * 2, dim.y + this.padding / scaleY * 2);
    // if there is background color no other shadows
    // should be casted
    this._removeShadow(ctx);
  }

  /**
   * Fires the even of selection changed
   * @private
   */
  _fireSelectionChanged() {
    this.fire('selection:changed');
    this.canvas && this.canvas.fire('text:selection:changed', {
      target: this
    });
  }

  /**
   * Initialize text dimensions. Render all text on given context
   * or on a offscreen canvas to get the text width with measureText.
   * Updates this.width and this.height with the proper values.
   * Does not return dimensions.
   * @private
   */
  initDimensions() {
    this.isEditing && this.initDelayedCursor();
    super.initDimensions();
  }

  /**
   * Gets style of a current selection/cursor (at the start position)
   * if startIndex or endIndex are not provided, selectionStart or selectionEnd will be used.
   * @param {Number} startIndex Start index to get styles at
   * @param {Number} endIndex End index to get styles at, if not specified selectionEnd or startIndex + 1
   * @param {Boolean} [complete] get full style or not
   * @return {Array} styles an array with one, zero or more Style objects
   */
  getSelectionStyles() {
    let startIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.selectionStart || 0;
    let endIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.selectionEnd;
    let complete = arguments.length > 2 ? arguments[2] : undefined;
    return super.getSelectionStyles(startIndex, endIndex, complete);
  }
  getStylesForSelection() {
    return this.selectionStart === this.selectionEnd ? [this.getStyleAtPosition(Math.max(0, this.selectionStart - 1), true)] : this.getSelectionStyles(this.selectionStart, this.selectionEnd, true);
  }

  /**
   * Sets style of a current selection, if no selection exist, do not set anything.
   * @param {Object} [styles] Styles object
   * @param {Number} [startIndex] Start index to get styles at
   * @param {Number} [endIndex] End index to get styles at, if not specified selectionEnd or startIndex + 1
   */
  setSelectionStyles(styles) {
    let startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.selectionStart || 0;
    let endIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.selectionEnd;
    return super.setSelectionStyles(styles, startIndex, endIndex);
  }

  /**
   * Returns 2d representation (lineIndex and charIndex) of cursor (or selection start)
   * @param {Number} [selectionStart] Optional index. When not given, current selectionStart is used.
   * @param {Boolean} [skipWrapping] consider the location for unwrapped lines. useful to manage styles.
   */
  get2DCursorLocation() {
    let selectionStart = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.selectionStart;
    let skipWrapping = arguments.length > 1 ? arguments[1] : undefined;
    return super.get2DCursorLocation(selectionStart, skipWrapping);
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  render(ctx) {
    super.render(ctx);
    // clear the cursorOffsetCache, so we ensure to calculate once per renderCursor
    // the correct position but not at every cursor animation.
    this.cursorOffsetCache = {};
    this.renderCursorOrSelection();
  }

  /**
   * @override block cursor/selection logic while rendering the exported canvas
   * @todo this workaround should be replaced with a more robust solution
   */
  toCanvasElement(options) {
    const isEditing = this.isEditing;
    this.isEditing = false;
    const canvas = super.toCanvasElement(options);
    this.isEditing = isEditing;
    return canvas;
  }

  /**
   * Renders cursor or selection (depending on what exists)
   * it does on the contextTop. If contextTop is not available, do nothing.
   */
  renderCursorOrSelection() {
    if (!this.isEditing || !this.canvas) {
      return;
    }
    const ctx = this.clearContextTop(true);
    if (!ctx) {
      return;
    }
    const boundaries = this._getCursorBoundaries();
    const ancestors = this.findAncestorsWithClipPath();
    const hasAncestorsWithClipping = ancestors.length > 0;
    let drawingCtx = ctx;
    let drawingCanvas = undefined;
    if (hasAncestorsWithClipping) {
      // we have some clipPath, we need to draw the selection on an intermediate layer.
      drawingCanvas = createCanvasElementFor(ctx.canvas);
      drawingCtx = drawingCanvas.getContext('2d');
      applyCanvasTransform(drawingCtx, this.canvas);
      const m = this.calcTransformMatrix();
      drawingCtx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    }
    if (this.selectionStart === this.selectionEnd && !this.inCompositionMode) {
      this.renderCursor(drawingCtx, boundaries);
    } else {
      this.renderSelection(drawingCtx, boundaries);
    }
    if (hasAncestorsWithClipping) {
      // we need a neutral context.
      // this won't work for nested clippaths in which a clippath
      // has its own clippath
      for (const ancestor of ancestors) {
        const clipPath = ancestor.clipPath;
        const clippingCanvas = createCanvasElementFor(ctx.canvas);
        const clippingCtx = clippingCanvas.getContext('2d');
        applyCanvasTransform(clippingCtx, this.canvas);
        // position the ctx in the center of the outer ancestor
        if (!clipPath.absolutePositioned) {
          const m = ancestor.calcTransformMatrix();
          clippingCtx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
        }
        clipPath.transform(clippingCtx);
        // we assign an empty drawing context, we don't plan to have this working for nested clippaths for now
        clipPath.drawObject(clippingCtx, true, {});
        this.drawClipPathOnCache(drawingCtx, clipPath, clippingCanvas);
      }
    }
    if (hasAncestorsWithClipping) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(drawingCanvas, 0, 0);
    }
    this.canvas.contextTopDirty = true;
    ctx.restore();
  }

  /**
   * Finds and returns an array of clip paths that are applied to the parent
   * group(s) of the current FabricObject instance. The object's hierarchy is
   * traversed upwards (from the current object towards the root of the canvas),
   * checking each parent object for the presence of a `clipPath` that is not
   * absolutely positioned.
   */
  findAncestorsWithClipPath() {
    const clipPathAncestors = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let obj = this;
    while (obj) {
      if (obj.clipPath) {
        clipPathAncestors.push(obj);
      }
      obj = obj.parent;
    }
    return clipPathAncestors;
  }

  /**
   * Returns cursor boundaries (left, top, leftOffset, topOffset)
   * left/top are left/top of entire text box
   * leftOffset/topOffset are offset from that left/top point of a text box
   * @private
   * @param {number} [index] index from start
   * @param {boolean} [skipCaching]
   */
  _getCursorBoundaries() {
    let index = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.selectionStart;
    let skipCaching = arguments.length > 1 ? arguments[1] : undefined;
    const left = this._getLeftOffset(),
      top = this._getTopOffset(),
      offsets = this._getCursorBoundariesOffsets(index, skipCaching);
    return {
      left: left,
      top: top,
      leftOffset: offsets.left,
      topOffset: offsets.top
    };
  }

  /**
   * Caches and returns cursor left/top offset relative to instance's center point
   * @private
   * @param {number} index index from start
   * @param {boolean} [skipCaching]
   */
  _getCursorBoundariesOffsets(index, skipCaching) {
    if (skipCaching) {
      return this.__getCursorBoundariesOffsets(index);
    }
    if (this.cursorOffsetCache && 'top' in this.cursorOffsetCache) {
      return this.cursorOffsetCache;
    }
    return this.cursorOffsetCache = this.__getCursorBoundariesOffsets(index);
  }

  /**
   * Calculates cursor left/top offset relative to instance's center point
   * @private
   * @param {number} index index from start
   */
  __getCursorBoundariesOffsets(index) {
    let topOffset = 0,
      leftOffset = 0;
    const {
      charIndex,
      lineIndex
    } = this.get2DCursorLocation(index);
    for (let i = 0; i < lineIndex; i++) {
      topOffset += this.getHeightOfLine(i);
    }
    const lineLeftOffset = this._getLineLeftOffset(lineIndex);
    const bound = this.__charBounds[lineIndex][charIndex];
    bound && (leftOffset = bound.left);
    if (this.charSpacing !== 0 && charIndex === this._textLines[lineIndex].length) {
      leftOffset -= this._getWidthOfCharSpacing();
    }
    const boundaries = {
      top: topOffset,
      left: lineLeftOffset + (leftOffset > 0 ? leftOffset : 0)
    };
    if (this.direction === 'rtl') {
      if (this.textAlign === RIGHT || this.textAlign === JUSTIFY || this.textAlign === JUSTIFY_RIGHT) {
        boundaries.left *= -1;
      } else if (this.textAlign === LEFT || this.textAlign === JUSTIFY_LEFT) {
        boundaries.left = lineLeftOffset - (leftOffset > 0 ? leftOffset : 0);
      } else if (this.textAlign === CENTER || this.textAlign === JUSTIFY_CENTER) {
        boundaries.left = lineLeftOffset - (leftOffset > 0 ? leftOffset : 0);
      }
    }
    return boundaries;
  }

  /**
   * Renders cursor on context Top, outside the animation cycle, on request
   * Used for the drag/drop effect.
   * If contextTop is not available, do nothing.
   */
  renderCursorAt(selectionStart) {
    this._renderCursor(this.canvas.contextTop, this._getCursorBoundaries(selectionStart, true), selectionStart);
  }

  /**
   * Renders cursor
   * @param {Object} boundaries
   * @param {CanvasRenderingContext2D} ctx transformed context to draw on
   */
  renderCursor(ctx, boundaries) {
    this._renderCursor(ctx, boundaries, this.selectionStart);
  }

  /**
   * Return the data needed to render the cursor for given selection start
   * The left,top are relative to the object, while width and height are prescaled
   * to look think with canvas zoom and object scaling,
   * so they depend on canvas and object scaling
   */
  getCursorRenderingData() {
    let selectionStart = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.selectionStart;
    let boundaries = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this._getCursorBoundaries(selectionStart);
    const cursorLocation = this.get2DCursorLocation(selectionStart),
      lineIndex = cursorLocation.lineIndex,
      charIndex = cursorLocation.charIndex > 0 ? cursorLocation.charIndex - 1 : 0,
      charHeight = this.getValueOfPropertyAt(lineIndex, charIndex, 'fontSize'),
      multiplier = this.getObjectScaling().x * this.canvas.getZoom(),
      cursorWidth = this.cursorWidth / multiplier,
      dy = this.getValueOfPropertyAt(lineIndex, charIndex, 'deltaY'),
      topOffset = boundaries.topOffset + (1 - this._fontSizeFraction) * this.getHeightOfLine(lineIndex) / this.lineHeight - charHeight * (1 - this._fontSizeFraction);
    return {
      color: this.cursorColor || this.getValueOfPropertyAt(lineIndex, charIndex, 'fill'),
      opacity: this._currentCursorOpacity,
      left: boundaries.left + boundaries.leftOffset - cursorWidth / 2,
      top: topOffset + boundaries.top + dy,
      width: cursorWidth,
      height: charHeight
    };
  }

  /**
   * Render the cursor at the given selectionStart.
   * @param {CanvasRenderingContext2D} ctx transformed context to draw on
   */
  _renderCursor(ctx, boundaries, selectionStart) {
    const {
      color,
      opacity,
      left,
      top,
      width,
      height
    } = this.getCursorRenderingData(selectionStart, boundaries);
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.fillRect(left, top, width, height);
  }

  /**
   * Renders text selection
   * @param {Object} boundaries Object with left/top/leftOffset/topOffset
   * @param {CanvasRenderingContext2D} ctx transformed context to draw on
   */
  renderSelection(ctx, boundaries) {
    const selection = {
      selectionStart: this.inCompositionMode ? this.hiddenTextarea.selectionStart : this.selectionStart,
      selectionEnd: this.inCompositionMode ? this.hiddenTextarea.selectionEnd : this.selectionEnd
    };
    this._renderSelection(ctx, selection, boundaries);
  }

  /**
   * Renders drag start text selection
   */
  renderDragSourceEffect() {
    const dragStartSelection = this.draggableTextDelegate.getDragStartSelection();
    this._renderSelection(this.canvas.contextTop, dragStartSelection, this._getCursorBoundaries(dragStartSelection.selectionStart, true));
  }
  renderDropTargetEffect(e) {
    const dragSelection = this.getSelectionStartFromPointer(e);
    this.renderCursorAt(dragSelection);
  }

  /**
   * Renders text selection
   * @private
   * @param {{ selectionStart: number, selectionEnd: number }} selection
   * @param {Object} boundaries Object with left/top/leftOffset/topOffset
   * @param {CanvasRenderingContext2D} ctx transformed context to draw on
   */
  _renderSelection(ctx, selection, boundaries) {
    const selectionStart = selection.selectionStart,
      selectionEnd = selection.selectionEnd,
      isJustify = this.textAlign.includes(JUSTIFY),
      start = this.get2DCursorLocation(selectionStart),
      end = this.get2DCursorLocation(selectionEnd),
      startLine = start.lineIndex,
      endLine = end.lineIndex,
      startChar = start.charIndex < 0 ? 0 : start.charIndex,
      endChar = end.charIndex < 0 ? 0 : end.charIndex;
    for (let i = startLine; i <= endLine; i++) {
      const lineOffset = this._getLineLeftOffset(i) || 0;
      let lineHeight = this.getHeightOfLine(i),
        realLineHeight = 0,
        boxStart = 0,
        boxEnd = 0;
      if (i === startLine) {
        boxStart = this.__charBounds[startLine][startChar].left;
      }
      if (i >= startLine && i < endLine) {
        boxEnd = isJustify && !this.isEndOfWrapping(i) ? this.width : this.getLineWidth(i) || 5; // WTF is this 5?
      } else if (i === endLine) {
        if (endChar === 0) {
          boxEnd = this.__charBounds[endLine][endChar].left;
        } else {
          const charSpacing = this._getWidthOfCharSpacing();
          boxEnd = this.__charBounds[endLine][endChar - 1].left + this.__charBounds[endLine][endChar - 1].width - charSpacing;
        }
      }
      realLineHeight = lineHeight;
      if (this.lineHeight < 1 || i === endLine && this.lineHeight > 1) {
        lineHeight /= this.lineHeight;
      }
      let drawStart = boundaries.left + lineOffset + boxStart,
        drawHeight = lineHeight,
        extraTop = 0;
      const drawWidth = boxEnd - boxStart;
      if (this.inCompositionMode) {
        ctx.fillStyle = this.compositionColor || 'black';
        drawHeight = 1;
        extraTop = lineHeight;
      } else {
        ctx.fillStyle = this.selectionColor;
      }
      if (this.direction === 'rtl') {
        if (this.textAlign === RIGHT || this.textAlign === JUSTIFY || this.textAlign === JUSTIFY_RIGHT) {
          drawStart = this.width - drawStart - drawWidth;
        } else if (this.textAlign === LEFT || this.textAlign === JUSTIFY_LEFT) {
          drawStart = boundaries.left + lineOffset - boxEnd;
        } else if (this.textAlign === CENTER || this.textAlign === JUSTIFY_CENTER) {
          drawStart = boundaries.left + lineOffset - boxEnd;
        }
      }
      ctx.fillRect(drawStart, boundaries.top + boundaries.topOffset + extraTop, drawWidth, drawHeight);
      boundaries.topOffset += realLineHeight;
    }
  }

  /**
   * High level function to know the height of the cursor.
   * the currentChar is the one that precedes the cursor
   * Returns fontSize of char at the current cursor
   * Unused from the library, is for the end user
   * @return {Number} Character font size
   */
  getCurrentCharFontSize() {
    const cp = this._getCurrentCharIndex();
    return this.getValueOfPropertyAt(cp.l, cp.c, 'fontSize');
  }

  /**
   * High level function to know the color of the cursor.
   * the currentChar is the one that precedes the cursor
   * Returns color (fill) of char at the current cursor
   * if the text object has a pattern or gradient for filler, it will return that.
   * Unused by the library, is for the end user
   * @return {String | TFiller} Character color (fill)
   */
  getCurrentCharColor() {
    const cp = this._getCurrentCharIndex();
    return this.getValueOfPropertyAt(cp.l, cp.c, FILL);
  }

  /**
   * Returns the cursor position for the getCurrent.. functions
   * @private
   */
  _getCurrentCharIndex() {
    const cursorPosition = this.get2DCursorLocation(this.selectionStart, true),
      charIndex = cursorPosition.charIndex > 0 ? cursorPosition.charIndex - 1 : 0;
    return {
      l: cursorPosition.lineIndex,
      c: charIndex
    };
  }
  dispose() {
    this.exitEditingImpl();
    this.draggableTextDelegate.dispose();
    super.dispose();
  }
}
/**
 * Index where text selection starts (or where cursor is when there is no selection)
 * @type Number
 * @default
 */
/**
 * Index where text selection ends
 * @type Number
 * @default
 */
/**
 * Color of text selection
 * @type String
 * @default
 */
/**
 * Indicates whether text is in editing mode
 * @type Boolean
 * @default
 */
/**
 * Indicates whether a text can be edited
 * @type Boolean
 * @default
 */
/**
 * Border color of text object while it's in editing mode
 * @type String
 * @default
 */
/**
 * Width of cursor (in px)
 * @type Number
 * @default
 */
/**
 * Color of text cursor color in editing mode.
 * if not set (default) will take color from the text.
 * if set to a color value that fabric can understand, it will
 * be used instead of the color of the text at the current position.
 * @type String
 * @default
 */
/**
 * Delay between cursor blink (in ms)
 * @type Number
 * @default
 */
/**
 * Duration of cursor fade in (in ms)
 * @type Number
 * @default
 */
/**
 * Indicates whether internal text char widths can be cached
 * @type Boolean
 * @default
 */
_defineProperty(IText, "ownDefaults", iTextDefaultValues);
_defineProperty(IText, "type", 'IText');
classRegistry.setClass(IText);
// legacy
classRegistry.setClass(IText, 'i-text');

export { IText, iTextDefaultValues };
//# sourceMappingURL=IText.mjs.map
