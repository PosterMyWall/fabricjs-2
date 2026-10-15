import { cache } from '../../cache';
import type { GlyphInkBounds } from '../../cache';
import type { NORMAL } from '../../constants';
import {
  DEFAULT_SVG_FONT_SIZE,
  FILL,
  iMatrix,
  LTR,
  RTL,
  STROKE,
} from '../../constants';
import { config } from '../../config';
import { deepPlainValuesEqual } from '../../util/internals/deepPlainValues';
import type { ObjectEvents } from '../../EventTypeDefs';
import type {
  CompleteTextStyleDeclaration,
  TextStyle,
  TextStyleDeclaration,
} from './StyledText';
import { StyledText } from './StyledText';
import { SHARED_ATTRIBUTES } from '../../parser/attributes';
import { parseAttributes } from '../../parser/parseAttributes';
import type {
  Abortable,
  TCacheCanvasDimensions,
  TClassProperties,
  TFiller,
  TOptions,
} from '../../typedefs';
import { classRegistry } from '../../ClassRegistry';
import { graphemeSplit } from '../../util/lang_string';
import { createCanvasElementFor } from '../../util/misc/dom';
import type { TextStyleArray } from '../../util/misc/textStyles';
import {
  hasStyleChanged,
  stylesFromArray,
  stylesToArray,
} from '../../util/misc/textStyles';
import { getPathSegmentsInfo, getPointOnPath } from '../../util/path';
import { cacheProperties } from '../Object/FabricObject';
import type { Path } from '../Path';
import { TextSVGExportMixin } from './TextSVGExportMixin';
import { applyMixins } from '../../util/applyMixins';
import type { FabricObjectProps, SerializedObjectProps } from '../Object/types';
import type { StylePropertiesType } from './constants';
import {
  additionalProps,
  textDefaultValues,
  textLayoutProperties,
  JUSTIFY,
  JUSTIFY_CENTER,
  JUSTIFY_LEFT,
  JUSTIFY_RIGHT,
  TEXT_DECORATION_COLOR,
  TEXT_DECORATION_THICKNESS,
} from './constants';
import { CENTER, LEFT, RIGHT, TOP, BOTTOM } from '../../constants';
import { isFiller } from '../../util/typeAssertions';
import type { Gradient } from '../../gradient/Gradient';
import type { Pattern } from '../../Pattern';
import type { CSSRules } from '../../parser/typedefs';
import { normalizeWs } from '../../util/internals/normalizeWhiteSpace';

let measuringContext: CanvasRenderingContext2D | null;

/**
 * Return a context for measurement of text string.
 * if created it gets stored for reuse
 */
function getMeasuringContext() {
  if (!measuringContext) {
    const canvas = createCanvasElementFor({
      width: 0,
      height: 0,
    });
    measuringContext = canvas.getContext('2d');
  }
  return measuringContext;
}

export type TPathSide = 'left' | 'right';

export type TPathAlign = 'baseline' | 'center' | 'ascender' | 'descender';

export type TextLinesInfo = {
  lines: string[];
  graphemeLines: string[][];
  graphemeText: string[];
  _unwrappedLines: string[][];
};

export type TextAlign =
  | typeof LEFT
  | typeof CENTER
  | typeof RIGHT
  | typeof JUSTIFY
  | typeof JUSTIFY_LEFT
  | typeof JUSTIFY_CENTER
  | typeof JUSTIFY_RIGHT;

export type FontStyle = '' | typeof NORMAL | 'italic' | 'oblique';

/**
 * Measure and return the info of a single grapheme.
 * needs the the info of previous graphemes already filled
 * Override to customize measuring
 */
/**
 * *PMW* One real line's style record. Fabric consumes:
 * - `textAlign`: overrides the object alignment for the line;
 * - `leftIndent`: explicit extra left offset in text units (also reserved from the wrap width);
 * - `listMarker`: a marker string (bullet glyph / ordinal) drawn in the gutter left of the
 *   line's first visual row — when set without `leftIndent`, the indent is auto-measured from
 *   the marker plus a gap;
 * - `listMarkerFontFamily` / `listMarkerFill`: marker font/fill, defaulting to the line's first
 *   character's effective style.
 * Every other key is an opaque passenger preserved by the editing logic.
 */
export type LineStyleDeclaration = {
  textAlign?: string;
  leftIndent?: number;
  listMarker?: string;
  listMarkerFontFamily?: string;
  listMarkerFill?: string;
} & Record<string, unknown>;

/** *PMW* gap between a list marker and its line, as a fraction of the marker's font size. */
const LIST_MARKER_GAP_FACTOR = 0.25;

/**
 * *PMW* Unordered markers draw raised by fontSize / this factor: the bullets-font glyph sits low
 * in its em box, and the legacy renderer optically centered it by shifting its bullets textbox up
 * by the same amount (BULLETS_TOP_DISTANCE_FACTOR = 16 in the legacy webapp text item). Ordered
 * markers sit on the row baseline.
 */
const UNORDERED_MARKER_RAISE_FACTOR = 16;

/**
 * *PMW* Floor for the list gutter, as a multiple of the marker's font size. Every list row at a
 * given font size reserves at least this much, so bullet rows, numbered rows and separate
 * textboxes all share one text column instead of each starting at its own measured width.
 * 1.25 = the widest unordered marker (every glyph of PMW's `bullets` font is exactly 1.0em)
 * plus LIST_MARKER_GAP_FACTOR, so unordered lists sit exactly on the floor and ordinals wider
 * than the floor ("10.", "VIII.") still grow the gutter past it.
 * Mirrored in PHP as MigrateToVersion80::LIST_GUTTER_EM_FACTOR — keep both in sync.
 */
const LIST_GUTTER_EM_FACTOR = 1.25;

/**
 * *PMW* The spell-check squiggle's geometry, in text units at this font size; every other size
 * scales it proportionally (see Text.fillSquigglyLine). 45 is the size the fixed-pixel squiggle
 * was tuned for, so headings look exactly as before and small text gets a proportionate wave.
 */
const SQUIGGLY_LINE_REFERENCE_FONT_SIZE = 45;
const SQUIGGLY_LINE_DOT_SIZE = 2;
const SQUIGGLY_LINE_DOT_STEP = 0.5;
const SQUIGGLY_LINE_LEAD_IN = 2;
const SQUIGGLY_LINE_WAVE_FREQUENCY = 0.35;
const SQUIGGLY_LINE_WAVE_PERIOD = 6;
/** Peak rise = (period / 2) × this factor: 6.75 text units at the reference size. */
const SQUIGGLY_LINE_WAVE_RISE_FACTOR = 5 * 0.45;

export type GraphemeBBox = {
  width: number;
  height: number;
  kernedWidth: number;
  left: number;
  deltaY: number;
  renderLeft?: number;
  renderTop?: number;
  angle?: number;
  /** *PMW* ink extent of the grapheme in text units, see {@link GlyphInkBounds} */
  ink?: GlyphInkBounds;
};

/**
 * *PMW* How far the painted glyphs of a text object reach past its width and height, in
 * text units: `horizontal` is the larger of the left and right reach, `vertical` the larger
 * of the reach above the first line and below the last. 0 when every glyph fits the box.
 */
export type TGlyphOverhang = {
  horizontal: number;
  vertical: number;
};

// @TODO this is not complete
interface UniqueTextProps {
  charSpacing: number;
  lineHeight: number;
  fontSize: number;
  cacheExpansionFactor: number;
  fontWeight: string | number;
  fontFamily: string;
  fontStyle: FontStyle;
  pathSide: TPathSide;
  pathAlign: TPathAlign;
  underline: boolean;
  overline: boolean;
  linethrough: boolean;
  textAlign: TextAlign;
  squigglyline: boolean;
  ignoreDelegatedSet: boolean;
  squigglylineColor: string;
  isStrokeForBold: boolean;
  pmwRunStyles?: Record<string, unknown>;
  direction: CanvasDirection;
  path?: Path;
  textDecorationThickness: number;
  textDecorationColor?: string;
}

export interface SerializedTextProps
  extends SerializedObjectProps, UniqueTextProps {
  styles: TextStyleArray | TextStyle;
}

export interface TextProps extends FabricObjectProps, UniqueTextProps {
  styles: TextStyle;
}

/**
 * Text class
 * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-2#text}
 */
/**
 * *PMW* Resolves a fill value to the color a list marker inherits: a string fill is itself; a
 * Gradient contributes its lowest-offset stop's color (the marker glyph is too small to ramp).
 * Pattern fills resolve to nothing and fall through the caller's chain.
 */
function getMarkerColorFromFill(fill: unknown): string | undefined {
  if (typeof fill === 'string' && fill) {
    return fill;
  }
  const colorStops =
    fill && typeof fill === 'object'
      ? (fill as Gradient<'linear'>).colorStops
      : undefined;
  if (!Array.isArray(colorStops) || colorStops.length === 0) {
    return undefined;
  }
  let firstStop = colorStops[0];
  for (const stop of colorStops) {
    if (stop.offset < firstStop.offset) {
      firstStop = stop;
    }
  }
  return firstStop.color;
}

export class FabricText<
  Props extends TOptions<TextProps> = Partial<TextProps>,
  SProps extends SerializedTextProps = SerializedTextProps,
  EventSpec extends ObjectEvents = ObjectEvents,
>
  extends StyledText<Props, SProps, EventSpec>
  implements UniqueTextProps
{
  /**
   * Properties that requires a text layout recalculation when changed
   * @type string[]
   * @protected
   */
  static textLayoutProperties: string[] = textLayoutProperties;

  /**
   * @private
   */
  declare _reNewline: RegExp;

  /**
   * Use this regular expression to filter for whitespaces that is not a new line.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  declare _reSpacesAndTabs: RegExp;

  /**
   * Use this regular expression to filter for whitespace that is not a new line.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  declare _reSpaceAndTab: RegExp;

  /**
   * Use this regular expression to filter consecutive groups of non spaces.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  declare _reWords: RegExp;

  declare text: string;

  /**
   * Font size (in pixels)
   * @type Number
   */
  declare fontSize: number;

  /**
   * *PMW*
   * Property added to expand text cache canvas more than default expansion for fonts which get cut off.
   */
  declare cacheExpansionFactor: number;

  /**
   * Font weight (e.g. bold, normal, 400, 600, 800)
   * @type {(Number|String)}
   */
  declare fontWeight: string | number;

  /**
   * Font family
   * @type String
   */
  declare fontFamily: string;

  /**
   * Text decoration underline.
   * @type Boolean
   */
  declare underline: boolean;

  /**
   * Text decoration overline.
   * @type Boolean
   */
  declare overline: boolean;

  /**
   * Text decoration linethrough.
   * @type Boolean
   */
  declare linethrough: boolean;

  /*PMW*/
  declare squigglyline: boolean;
  /*PMW*/
  declare squigglylineColor: string;
  declare isStrokeForBold: boolean;
  /*PMW* Opaque per-character passenger carried in `styles` declarations only.
   * Fabric never renders or assigns it at object level (no default on purpose);
   * it exists so the style pipeline (get/setSelectionStyles, editing shifts,
   * serialization) preserves caller-owned data attached to characters. */
  declare pmwRunStyles?: Record<string, unknown>;

  //*PMW*
  /******These are just custom properties later used by our webapp code. They are added here for ts support*************/
  declare ignoreDelegatedSet: boolean;

  /**
   * Text alignment. Possible values: "left", "center", "right", "justify",
   * "justify-left", "justify-center" or "justify-right".
   * @type TextAlign
   */
  declare textAlign: TextAlign;

  /**
   * Font style . Possible values: "", "normal", "italic" or "oblique".
   * @type FontStyle
   */
  declare fontStyle: FontStyle;

  /**
   * Line height
   * @type Number
   */
  declare lineHeight: number;

  /**
   * Superscript schema object (minimum overlap)
   */
  declare superscript: {
    /**
     * fontSize factor
     * @default 0.6
     */
    size: number;
    /**
     * baseline-shift factor (upwards)
     * @default -0.35
     */
    baseline: number;
  };

  /**
   * Subscript schema object (minimum overlap)
   */
  declare subscript: {
    /**
     * fontSize factor
     * @default 0.6
     */
    size: number;
    /**
     * baseline-shift factor (downwards)
     * @default 0.11
     */
    baseline: number;
  };

  /**
   * Background color of text lines
   * @type String
   */
  declare textBackgroundColor: string;

  declare styles: TextStyle;

  /**
   * *PMW* Per-line style declarations keyed by REAL (unwrapped) line index. Fabric consumes
   * `textAlign` (overrides the object-level alignment for that line) and `leftIndent` (extra
   * left offset in text units, e.g. for list rows); any other key is an opaque passenger that
   * the editing logic shifts with its line (see ITextBehavior). Never mutate a record in
   * place — writers always assign fresh objects so caches and snapshots stay coherent.
   */
  declare lineStyles: Record<number | string, LineStyleDeclaration>;

  /**
   * Path that the text should follow.
   * since 4.6.0 the path will be drawn automatically.
   * if you want to make the path visible, give it a stroke and strokeWidth or fill value
   * if you want it to be hidden, assign visible = false to the path.
   * This feature is in BETA, and SVG import/export is not yet supported.
   * @type Path
   * @example
   * const textPath = new Text('Text on a path', {
   *     top: 150,
   *     left: 150,
   *     textAlign: 'center',
   *     charSpacing: -50,
   *     path: new Path('M 0 0 C 50 -100 150 -100 200 0', {
   *         strokeWidth: 1,
   *         visible: false
   *     }),
   *     pathSide: 'left',
   *     pathStartOffset: 0
   * });
   */
  declare path?: Path;

  /**
   * The text decoration thickness for underline, overline and strikethrough
   * The thickness is expressed in thousandths of fontSize ( em ).
   * The original value was 1/15 that translates to 66.6667 thousandths.
   * The choice of unit of measure is to align with charSpacing.
   * You can slim the thickness without issues, while large underline or overline may end up
   * outside the bounding box of the text. In order to fix that a bigger refactor of the code
   * is needed and is out of scope for now. If you need such large overline on the first line
   * of text or large underline on the last line of text, consider disabling caching as a
   * workaround
   * @default 66.667
   */
  declare textDecorationThickness: number;

  /**
   * Optional text decoration color for underline, overline and strikethrough.
   * When undefined, decoration color falls back to the text fill color.
   * This feature is not really supported by anything else than svg 2 specs with css3 support.
   * Chrome does not support this, nor firefox apparently.
   */
  declare textDecorationColor?: string;

  /**
   * Offset amount for text path starting position
   * Only used when text has a path
   */
  declare pathStartOffset: number;

  /**
   * Which side of the path the text should be drawn on.
   * Only used when text has a path
   * @type {TPathSide} 'left|right'
   */
  declare pathSide: TPathSide;

  /**
   * How text is aligned to the path. This property determines
   * the perpendicular position of each character relative to the path.
   * (one of "baseline", "center", "ascender", "descender")
   * This feature is in BETA, and its behavior may change
   * @type TPathAlign
   */
  declare pathAlign: TPathAlign;

  /**
   * @private
   */
  declare _fontSizeFraction: number;

  /**
   * @private
   */
  declare offsets: {
    underline: number;
    linethrough: number;
    squigglyline: number;
    overline: number;
  };

  /**
   * Text Line proportion to font Size (in pixels)
   * @type Number
   */
  declare _fontSizeMult: number;

  /**
   * additional space between characters
   * expressed in thousands of em unit
   * @type Number
   */
  declare charSpacing: number;

  /**
   * Baseline shift, styles only, keep at 0 for the main text object
   * @type {Number}
   */
  declare deltaY: number;

  /**
   * WARNING: EXPERIMENTAL. NOT SUPPORTED YET
   * determine the direction of the text.
   * This has to be set manually together with textAlign and originX for proper
   * experience.
   * some interesting link for the future
   * https://www.w3.org/International/questions/qa-bidi-unicode-controls
   * @since 4.5.0
   * @type {CanvasDirection} 'ltr|rtl'
   */
  declare direction: CanvasDirection;

  /**
   * contains characters bounding boxes
   * This variable is considered to be protected.
   * But for how mixins are implemented right now, we can't leave it private
   * @protected
   */
  __charBounds: GraphemeBBox[][] = [];

  /** *PMW* memo of {@link getGlyphOverhang}, reset with the other layout caches */
  private __glyphOverhang: TGlyphOverhang | undefined;

  /**
   * use this size when measuring text. To avoid IE11 rounding errors
   * @type {Number}
   * @readonly
   * @private
   */
  declare CACHE_FONT_SIZE: number;

  /**
   * contains the min text width to avoid getting 0
   * @type {Number}
   */
  declare MIN_TEXT_WIDTH: number;

  /**
   * contains the the text of the object, divided in lines as they are displayed
   * on screen. Wrapping will divide the text independently of line breaks
   * @type {string[]}
   */
  declare textLines: string[];

  /**
   * same as textlines, but each line is an array of graphemes as split by splitByGrapheme
   * @type {string[]}
   */
  declare _textLines: string[][];

  declare _unwrappedTextLines: string[][];
  declare _text: string[];
  declare cursorWidth: number;
  declare __lineHeights: number[];
  declare __lineWidths: number[];
  /**
   * *PMW* Per-layout memo of each real line's measured list marker width, keyed by real line
   * index. Reset by _clearCache.
   */
  declare __listMarkerWidths: Record<number, number>;
  /**
   * *PMW* Per-layout memo of the shared list gutters (auto rows, migrated legacy rows). Reset
   * by _clearCache.
   */
  declare __listGutterWidths: { auto?: number; legacy?: number };
  declare initialized?: true;

  static cacheProperties = [...cacheProperties, ...additionalProps];

  static ownDefaults = textDefaultValues;

  static type = 'Text';

  static getDefaults(): Record<string, any> {
    return { ...super.getDefaults(), ...FabricText.ownDefaults };
  }

  constructor(text: string, options?: Props) {
    super();
    Object.assign(this, FabricText.ownDefaults);
    this.setOptions(options);
    if (!this.styles) {
      this.styles = {};
    }
    if (!this.lineStyles) {
      this.lineStyles = {};
    }
    this.text = text;
    this.initialized = true;
    if (this.path) {
      this.setPathInfo();
    }
    this.initDimensions();
    this.setCoords();
  }

  /**
   * If text has a path, it will add the extra information needed
   * for path and text calculations
   */
  setPathInfo() {
    const path = this.path;
    if (path) {
      path.segmentsInfo = getPathSegmentsInfo(path.path);
    }
  }

  /**
   * @private
   * Divides text into lines of text and lines of graphemes.
   */
  _splitText(): TextLinesInfo {
    const newLines = this._splitTextIntoLines(this.text);
    this.textLines = newLines.lines;
    this._textLines = newLines.graphemeLines;
    this._unwrappedTextLines = newLines._unwrappedLines;
    this._text = newLines.graphemeText;
    return newLines;
  }

  /**
   * Initialize or update text dimensions.
   * Updates this.width and this.height with the proper values.
   * Does not return dimensions.
   */
  initDimensions() {
    this._splitText();
    this._clearCache();
    this.dirty = true;
    if (this.path) {
      this.width = this.path.width;
      this.height = this.path.height;
    } else {
      this.width =
        this.calcTextWidth() || this.cursorWidth || this.MIN_TEXT_WIDTH;
      this.height = this.calcTextHeight();
    }
    if (this.textAlign.includes(JUSTIFY)) {
      // once text is measured we need to make space fatter to make justified text.
      this.enlargeSpaces();
    }
  }

  /**
   * Enlarge space boxes and shift the others
   */
  enlargeSpaces() {
    let diffSpace,
      currentLineWidth,
      numberOfSpaces,
      accumulatedSpace,
      line,
      charBound,
      spaces;
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      // *PMW* a line whose alignment override is not a justify variant keeps natural spaces
      if (!this._getEffectiveTextAlignForLine(i).includes(JUSTIFY)) {
        continue;
      }
      if (
        this.textAlign !== JUSTIFY &&
        (i === len - 1 || this.isEndOfWrapping(i))
      ) {
        continue;
      }
      accumulatedSpace = 0;
      line = this._textLines[i];
      currentLineWidth = this.getLineWidth(i);
      // *PMW* a list/indented line justifies into the space left of its reserved gutter
      const justifiableWidth =
        this.width - this._getRealLineReservedWidth(this._getRealLineIndex(i));
      if (
        currentLineWidth < justifiableWidth &&
        (spaces = this.textLines[i].match(this._reSpacesAndTabs))
      ) {
        numberOfSpaces = spaces.length;
        diffSpace = (justifiableWidth - currentLineWidth) / numberOfSpaces;
        for (let j = 0; j <= line.length; j++) {
          charBound = this.__charBounds[i][j];
          if (this._reSpaceAndTab.test(line[j])) {
            charBound.width += diffSpace;
            charBound.kernedWidth += diffSpace;
            charBound.left += accumulatedSpace;
            accumulatedSpace += diffSpace;
          } else {
            charBound.left += accumulatedSpace;
          }
        }
      }
    }
  }

  /**
   * Detect if the text line is ended with an hard break
   * text and itext do not have wrapping, return false
   * @return {Boolean}
   */
  isEndOfWrapping(lineIndex: number): boolean {
    return lineIndex === this._textLines.length - 1;
  }

  /**
   * Detect if a line has a linebreak and so we need to account for it when moving
   * and counting style.
   * It return always 1 for text and Itext. Textbox has its own implementation
   * @return Number
   */
  missingNewlineOffset(lineIndex: number, skipWrapping?: boolean): 0 | 1;
  missingNewlineOffset(_lineIndex: number): 1 {
    return 1;
  }

  /**
   * Returns 2d representation (lineIndex and charIndex) of cursor
   * @param {Number} selectionStart
   * @param {Boolean} [skipWrapping] consider the location for unwrapped lines. useful to manage styles.
   */
  get2DCursorLocation(selectionStart: number, skipWrapping?: boolean) {
    const lines = skipWrapping ? this._unwrappedTextLines : this._textLines;
    let i: number;
    for (i = 0; i < lines.length; i++) {
      if (selectionStart <= lines[i].length) {
        return {
          lineIndex: i,
          charIndex: selectionStart,
        };
      }
      selectionStart -=
        lines[i].length + this.missingNewlineOffset(i, skipWrapping);
    }
    return {
      lineIndex: i - 1,
      charIndex:
        lines[i - 1].length < selectionStart
          ? lines[i - 1].length
          : selectionStart,
    };
  }

  /**
   * Returns string representation of an instance
   * @return {String} String representation of text object
   */
  toString(): string {
    return `#<Text (${this.complexity()}): { "text": "${
      this.text
    }", "fontFamily": "${this.fontFamily}" }>`;
  }

  /**
   * Return the dimension and the zoom level needed to create a cache canvas
   * big enough to host the object to be cached.
   * @private
   * @param {Object} dim.x width of object to be cached
   * @param {Object} dim.y height of object to be cached
   * @return {Object}.width width of canvas
   * @return {Object}.height height of canvas
   * @return {Object}.zoomX zoomX zoom value to unscale the canvas before drawing cache
   * @return {Object}.zoomY zoomY zoom value to unscale the canvas before drawing cache
   */
  _getCacheCanvasDimensions(): TCacheCanvasDimensions {
    const dims = super._getCacheCanvasDimensions();
    const fontSize = this.fontSize;
    // *PMW* glyphs that reach past the box (script swashes, deep descenders) need the
    // cache to hold their measured reach; the font size stays the floor fabric always had.
    const overhang = this.getGlyphOverhang();
    dims.width += Math.max(fontSize, 2 * overhang.horizontal) * dims.zoomX;
    dims.height +=
      Math.max(fontSize * this.cacheExpansionFactor, 2 * overhang.vertical) *
      dims.zoomY;
    // *PMW* per-character shadows render inside the cache canvas (unlike the object
    // shadow, which is applied when the cache is composited), so the cache must be
    // large enough to hold the widest shadow's blur and offset on every side.
    const charShadowExtent = this._getMaxCharShadowExtent();
    if (charShadowExtent > 0) {
      dims.width += charShadowExtent * 2 * dims.zoomX;
      dims.height += charShadowExtent * 2 * dims.zoomY;
    }
    return dims;
  }

  /**
   * *PMW* The largest reach (blur plus offset) of any per-character shadow declaration,
   * in text units. 0 when no character carries a shadow.
   * @private
   */
  _getMaxCharShadowExtent(): number {
    if (!this.styles || !this.styleHas('shadow')) {
      return 0;
    }
    let maxExtent = 0;
    for (const line of Object.values(this.styles)) {
      for (const decl of Object.values(line)) {
        const shadow = decl.shadow;
        if (shadow) {
          const extent =
            (shadow.blur || 0) +
            Math.max(
              Math.abs(shadow.offsetX || 0),
              Math.abs(shadow.offsetY || 0),
            );
          if (extent > maxExtent) {
            maxExtent = extent;
          }
        }
      }
    }
    return maxExtent;
  }

  /**
   * *PMW* How far the painted glyphs reach past the text box, in text units. Measured from
   * the ink bounds the browser reports for every grapheme ({@link GlyphInkBounds}), so an
   * uploaded script face is covered as well as a bundled one. Text on a path reports 0.
   */
  getGlyphOverhang(): TGlyphOverhang {
    if (!this.__glyphOverhang) {
      this.__glyphOverhang = this._computeGlyphOverhang();
    }
    return this.__glyphOverhang;
  }

  /**
   * *PMW* Walks every measured grapheme: horizontally, its ink left of the line start and
   * right of the box edge, both after the line's alignment offset (a right-to-left line lays
   * its graphemes out mirrored, so it takes no offset credit and reads conservatively);
   * vertically, the first line's ink above its baseline and the last line's ink below the
   * box bottom. A stroke paints half its width outside the outline on every side.
   * @private
   */
  _computeGlyphOverhang(): TGlyphOverhang {
    if (this.path) {
      return { horizontal: 0, vertical: 0 };
    }
    const lineCount = this._textLines.length;
    let horizontal = 0,
      vertical = 0,
      lineTop = 0;
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      // measuring the line fills __charBounds for it
      this.getLineWidth(lineIndex);
      const bounds = this.__charBounds[lineIndex],
        isRtl = this.direction === RTL,
        leftOffset = isRtl ? 0 : this._getLineLeftOffset(lineIndex),
        rightEdge = isRtl
          ? this.getLineWidth(lineIndex)
          : this.width - leftOffset,
        baselineFromTop =
          lineTop +
          this.getHeightOfLineImpl(lineIndex) * (1 - this._fontSizeFraction),
        roomBelowBaseline = this.height - baselineFromTop;
      for (
        let charIndex = 0;
        bounds && charIndex < this._textLines[lineIndex].length;
        charIndex++
      ) {
        const box = bounds[charIndex],
          ink = box.ink;
        if (!ink) {
          continue;
        }
        horizontal = Math.max(
          horizontal,
          ink.left - box.left - leftOffset,
          box.left + ink.right - rightEdge,
        );
        if (lineIndex === 0) {
          vertical = Math.max(
            vertical,
            ink.ascent - box.deltaY - baselineFromTop,
          );
        }
        if (lineIndex === lineCount - 1) {
          vertical = Math.max(
            vertical,
            ink.descent + box.deltaY - roomBelowBaseline,
          );
        }
      }
      lineTop += this.getHeightOfLine(lineIndex);
    }
    const strokeReach = this.stroke ? this.strokeWidth / 2 : 0;
    return {
      horizontal: Math.max(0, horizontal + strokeReach),
      vertical: Math.max(0, vertical + strokeReach),
    };
  }

  /**
   * *PMW* Applies a per-character shadow declaration (a plain
   * {color, blur, offsetX, offsetY} object, never a Shadow instance) to the context,
   * mirroring Object._setShadow's scaling math. Callers scope it with save/restore.
   * @private
   */
  _setCharShadow(
    ctx: CanvasRenderingContext2D,
    shadow: {
      color?: string;
      blur?: number;
      offsetX?: number;
      offsetY?: number;
    },
  ) {
    const retinaScaling = this.getCanvasRetinaScaling(),
      [sx, , , sy] = this.canvas?.viewportTransform || iMatrix,
      multX = sx * retinaScaling,
      multY = sy * retinaScaling,
      scaling = this.getObjectScaling();
    ctx.shadowColor = shadow.color || 'rgb(0,0,0)';
    ctx.shadowBlur =
      ((shadow.blur || 0) *
        config.browserShadowBlurConstant *
        (multX + multY) *
        (scaling.x + scaling.y)) /
      4;
    ctx.shadowOffsetX = (shadow.offsetX || 0) * multX * scaling.x;
    ctx.shadowOffsetY = (shadow.offsetY || 0) * multY * scaling.y;
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _render(ctx: CanvasRenderingContext2D) {
    const path = this.path;
    path && !path.isNotVisible() && path._render(ctx);
    this._setTextStyles(ctx);
    this._renderTextLinesBackground(ctx);
    this._renderTextDecoration(ctx, 'underline');
    this._renderText(ctx);
    this._renderTextDecoration(ctx, 'overline');
    this._renderTextDecoration(ctx, 'linethrough');
    this._renderTextDecoration(ctx, 'squigglyline'); // *PMW*
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderText(ctx: CanvasRenderingContext2D) {
    if (this.paintFirst === STROKE) {
      this._renderTextStroke(ctx);
      this._renderTextFill(ctx);
    } else {
      this._renderTextFill(ctx);
      this._renderTextStroke(ctx);
    }
  }

  /**
   * Set the font parameter of the context with the object properties or with charStyle
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Object} [charStyle] object with font style properties
   * @param {String} [charStyle.fontFamily] Font Family
   * @param {Number} [charStyle.fontSize] Font size in pixels. ( without px suffix )
   * @param {String} [charStyle.fontWeight] Font weight
   * @param {String} [charStyle.fontStyle] Font style (italic|normal)
   */
  _setTextStyles(
    ctx: CanvasRenderingContext2D,
    charStyle?: any,
    forMeasuring?: boolean,
  ) {
    ctx.textBaseline = 'alphabetic';
    if (this.path) {
      switch (this.pathAlign) {
        case CENTER:
          ctx.textBaseline = 'middle';
          break;
        case 'ascender':
          ctx.textBaseline = TOP;
          break;
        case 'descender':
          ctx.textBaseline = BOTTOM;
          break;
      }
    }
    ctx.font = this._getFontDeclaration(charStyle, forMeasuring);
  }

  /**
   * calculate and return the text Width measuring each line.
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @return {Number} Maximum width of Text object
   */
  calcTextWidth(): number {
    let maxWidth = this.getLineWidth(0);

    for (let i = 1, len = this._textLines.length; i < len; i++) {
      const currentLineWidth = this.getLineWidth(i);
      if (currentLineWidth > maxWidth) {
        maxWidth = currentLineWidth;
      }
    }
    return maxWidth;
  }

  /**
   * @private
   * @param {String} method Method name ("fillText" or "strokeText")
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} line Text to render
   * @param {Number} left Left position of text
   * @param {Number} top Top position of text
   * @param {Number} lineIndex Index of a line in a text
   */
  _renderTextLine(
    method: 'fillText' | 'strokeText',
    ctx: CanvasRenderingContext2D,
    line: string[],
    left: number,
    top: number,
    lineIndex: number,
  ) {
    this._renderChars(method, ctx, line, left, top, lineIndex);
  }

  /**
   * Renders the text background for lines, taking care of style
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextLinesBackground(ctx: CanvasRenderingContext2D) {
    if (!this.textBackgroundColor && !this.styleHas('textBackgroundColor')) {
      return;
    }
    const originalFill = ctx.fillStyle,
      leftOffset = this._getLeftOffset();
    let lineTopOffset = this._getTopOffset();

    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const heightOfLine = this.getHeightOfLine(i);
      if (
        !this.textBackgroundColor &&
        !this.styleHas('textBackgroundColor', i)
      ) {
        lineTopOffset += heightOfLine;
        continue;
      }
      const jlen = this._textLines[i].length;
      const lineLeftOffset = this._getLineLeftOffset(i);
      let boxWidth = 0;
      let boxStart = 0;
      let drawStart;
      let currentColor;
      let lastColor = this.getValueOfPropertyAt(i, 0, 'textBackgroundColor');
      const bgHeight = this.getHeightOfLineImpl(i);
      for (let j = 0; j < jlen; j++) {
        // at this point charbox are either standard or full with pathInfo if there is a path.
        const charBox = this.__charBounds[i][j] as Required<GraphemeBBox>;
        currentColor = this.getValueOfPropertyAt(i, j, 'textBackgroundColor');
        if (this.path) {
          ctx.save();
          ctx.translate(charBox.renderLeft, charBox.renderTop);
          ctx.rotate(charBox.angle);
          ctx.fillStyle = currentColor;
          currentColor &&
            ctx.fillRect(
              -charBox.width / 2,
              -bgHeight * (1 - this._fontSizeFraction),
              charBox.width,
              bgHeight,
            );
          ctx.restore();
        } else if (currentColor !== lastColor) {
          drawStart = leftOffset + lineLeftOffset + boxStart;
          if (this.direction === RTL) {
            drawStart = this.width - drawStart - boxWidth;
          }
          ctx.fillStyle = lastColor;
          lastColor &&
            ctx.fillRect(drawStart, lineTopOffset, boxWidth, bgHeight);
          boxStart = charBox.left;
          boxWidth = charBox.width;
          lastColor = currentColor;
        } else {
          boxWidth += charBox.kernedWidth;
        }
      }
      if (currentColor && !this.path) {
        drawStart = leftOffset + lineLeftOffset + boxStart;
        if (this.direction === RTL) {
          drawStart = this.width - drawStart - boxWidth;
        }
        ctx.fillStyle = currentColor;
        ctx.fillRect(drawStart, lineTopOffset, boxWidth, bgHeight);
      }
      lineTopOffset += heightOfLine;
    }
    ctx.fillStyle = originalFill;
    // if there is text background color no
    // other shadows should be casted
    this._removeShadow(ctx);
  }

  /**
   * measure and return the width of a single character.
   * possibly overridden to accommodate different measure logic or
   * to hook some external lib for character measurement
   * @private
   * @param {String} _char, char to be measured
   * @param {Object} charStyle style of char to be measured
   * @param {String} [previousChar] previous char
   * @param {Object} [prevCharStyle] style of previous char
   */
  _measureChar(
    _char: string,
    charStyle: CompleteTextStyleDeclaration,
    previousChar: string | undefined,
    prevCharStyle: CompleteTextStyleDeclaration | Record<string, never>,
  ) {
    const fontCache = cache.getFontCache(charStyle),
      inkCache = cache.getInkCache(charStyle),
      fontDeclaration = this._getFontDeclaration(charStyle),
      couple = previousChar ? previousChar + _char : _char,
      stylesAreEqual =
        previousChar &&
        fontDeclaration === this._getFontDeclaration(prevCharStyle),
      fontMultiplier = charStyle.fontSize / this.CACHE_FONT_SIZE;
    let width: number | undefined,
      coupleWidth: number | undefined,
      previousWidth: number | undefined,
      kernedWidth: number | undefined;

    if (previousChar && fontCache.has(previousChar)) {
      previousWidth = fontCache.get(previousChar);
    }
    if (fontCache.has(_char)) {
      kernedWidth = width = fontCache.get(_char);
    }
    if (stylesAreEqual && fontCache.has(couple)) {
      coupleWidth = fontCache.get(couple)!;
      kernedWidth = coupleWidth - previousWidth!;
    }
    let ink = inkCache.get(_char);
    if (
      width === undefined ||
      previousWidth === undefined ||
      coupleWidth === undefined ||
      ink === undefined
    ) {
      const ctx = getMeasuringContext()!;
      // send a TRUE to specify measuring font size CACHE_FONT_SIZE
      this._setTextStyles(ctx, charStyle, true);
      if (width === undefined || ink === undefined) {
        const metrics = ctx.measureText(_char);
        if (width === undefined) {
          kernedWidth = width = metrics.width;
          fontCache.set(_char, width);
        }
        // *PMW* the same measurement carries the ink extent; environments without the
        // bounding-box metrics (older node canvases) read as glyphs that fit their advance
        ink = {
          left: metrics.actualBoundingBoxLeft || 0,
          right: metrics.actualBoundingBoxRight || 0,
          ascent: metrics.actualBoundingBoxAscent || 0,
          descent: metrics.actualBoundingBoxDescent || 0,
        };
        inkCache.set(_char, ink);
      }
      if (previousWidth === undefined && stylesAreEqual && previousChar) {
        previousWidth = ctx.measureText(previousChar).width;
        fontCache.set(previousChar, previousWidth);
      }
      if (stylesAreEqual && coupleWidth === undefined) {
        // we can measure the kerning couple and subtract the width of the previous character
        coupleWidth = ctx.measureText(couple).width;
        fontCache.set(couple, coupleWidth);
        // safe to use the non-null since if undefined we defined it before.
        kernedWidth = coupleWidth - previousWidth!;
      }
    }
    return {
      width: width * fontMultiplier,
      kernedWidth: kernedWidth! * fontMultiplier,
      ink: {
        left: ink.left * fontMultiplier,
        right: ink.right * fontMultiplier,
        ascent: ink.ascent * fontMultiplier,
        descent: ink.descent * fontMultiplier,
      },
    };
  }

  /**
   * Computes height of character at given position
   * @param {Number} line the line index number
   * @param {Number} _char the character index number
   * @return {Number} fontSize of the character
   */
  getHeightOfChar(line: number, _char: number): number {
    return this.getValueOfPropertyAt(line, _char, 'fontSize');
  }

  /**
   * measure a text line measuring all characters.
   * @param {Number} lineIndex line number
   */
  measureLine(lineIndex: number) {
    const lineInfo = this._measureLine(lineIndex);
    if (this.charSpacing !== 0) {
      lineInfo.width -= this._getWidthOfCharSpacing();
    }
    if (lineInfo.width < 0) {
      lineInfo.width = 0;
    }
    return lineInfo;
  }

  /**
   * measure every grapheme of a line, populating __charBounds
   * @param {Number} lineIndex
   * @return {Object} object.width total width of characters
   * @return {Object} object.numOfSpaces length of chars that match this._reSpacesAndTabs
   */
  _measureLine(lineIndex: number) {
    let width = 0,
      prevGrapheme: string | undefined,
      graphemeInfo: GraphemeBBox | undefined;

    const reverse = this.pathSide === RIGHT,
      path = this.path,
      line = this._textLines[lineIndex],
      llength = line.length,
      lineBounds = new Array<GraphemeBBox>(llength);

    this.__charBounds[lineIndex] = lineBounds;
    for (let i = 0; i < llength; i++) {
      const grapheme = line[i];
      graphemeInfo = this._getGraphemeBox(grapheme, lineIndex, i, prevGrapheme);
      lineBounds[i] = graphemeInfo;
      width += graphemeInfo.kernedWidth;
      prevGrapheme = grapheme;
    }
    // this latest bound box represent the last character of the line
    // to simplify cursor handling in interactive mode.
    lineBounds[llength] = {
      left: graphemeInfo ? graphemeInfo.left + graphemeInfo.width : 0,
      width: 0,
      kernedWidth: 0,
      height: this.fontSize,
      deltaY: 0,
    } as GraphemeBBox;
    if (path && path.segmentsInfo) {
      let positionInPath = 0;
      const totalPathLength =
        path.segmentsInfo[path.segmentsInfo.length - 1].length;
      switch (this.textAlign) {
        case LEFT:
          positionInPath = reverse ? totalPathLength - width : 0;
          break;
        case CENTER:
          positionInPath = (totalPathLength - width) / 2;
          break;
        case RIGHT:
          positionInPath = reverse ? 0 : totalPathLength - width;
          break;
        //todo - add support for justify
      }
      positionInPath += this.pathStartOffset * (reverse ? -1 : 1);
      for (
        let i = reverse ? llength - 1 : 0;
        reverse ? i >= 0 : i < llength;
        reverse ? i-- : i++
      ) {
        graphemeInfo = lineBounds[i];
        if (positionInPath > totalPathLength) {
          positionInPath %= totalPathLength;
        } else if (positionInPath < 0) {
          positionInPath += totalPathLength;
        }
        // it would probably much faster to send all the grapheme position for a line
        // and calculate path position/angle at once.
        this._setGraphemeOnPath(positionInPath, graphemeInfo);
        positionInPath += graphemeInfo.kernedWidth;
      }
    }
    return { width: width, numOfSpaces: 0 };
  }

  /**
   * Calculate the angle  and the left,top position of the char that follow a path.
   * It appends it to graphemeInfo to be reused later at rendering
   * @private
   * @param {Number} positionInPath to be measured
   * @param {GraphemeBBox} graphemeInfo current grapheme box information
   * @param {Object} startingPoint position of the point
   */
  _setGraphemeOnPath(positionInPath: number, graphemeInfo: GraphemeBBox) {
    const centerPosition = positionInPath + graphemeInfo.kernedWidth / 2,
      path = this.path!;

    // we are at currentPositionOnPath. we want to know what point on the path is.
    const info = getPointOnPath(path.path, centerPosition, path.segmentsInfo)!;
    graphemeInfo.renderLeft = info.x - path.pathOffset.x;
    graphemeInfo.renderTop = info.y - path.pathOffset.y;
    graphemeInfo.angle = info.angle + (this.pathSide === RIGHT ? Math.PI : 0);
  }

  /**
   *
   * @param {String} grapheme to be measured
   * @param {Number} lineIndex index of the line where the char is
   * @param {Number} charIndex position in the line
   * @param {String} [prevGrapheme] character preceding the one to be measured
   * @returns {GraphemeBBox} grapheme bbox
   */
  _getGraphemeBox(
    grapheme: string,
    lineIndex: number,
    charIndex: number,
    prevGrapheme?: string,
    skipLeft?: boolean,
  ): GraphemeBBox {
    const style = this.getCompleteStyleDeclaration(lineIndex, charIndex),
      prevStyle = prevGrapheme
        ? this.getCompleteStyleDeclaration(lineIndex, charIndex - 1)
        : {},
      info = this._measureChar(grapheme, style, prevGrapheme, prevStyle);
    let kernedWidth = info.kernedWidth,
      width = info.width,
      charSpacing;

    if (this.charSpacing !== 0) {
      charSpacing = this._getWidthOfCharSpacing();
      width += charSpacing;
      kernedWidth += charSpacing;
    }

    const box: GraphemeBBox = {
      width,
      left: 0,
      height: style.fontSize,
      kernedWidth,
      deltaY: style.deltaY,
      ink: info.ink,
    };
    if (charIndex > 0 && !skipLeft) {
      const previousBox = this.__charBounds[lineIndex][charIndex - 1];
      box.left =
        previousBox.left + previousBox.width + info.kernedWidth - info.width;
    }
    return box;
  }

  /**
   * Calculate height of line at 'lineIndex',
   * without the lineHeigth multiplication factor
   * @private
   * @param {Number} lineIndex index of line to calculate
   * @return {Number}
   */
  private getHeightOfLineImpl(lineIndex: number): number {
    const lh = this.__lineHeights;
    if (lh[lineIndex]) {
      return lh[lineIndex];
    }

    // char 0 is measured before the line cycle because it needs to char
    // emptylines
    let maxHeight = this.getHeightOfChar(lineIndex, 0);
    for (let i = 1, len = this._textLines[lineIndex].length; i < len; i++) {
      maxHeight = Math.max(this.getHeightOfChar(lineIndex, i), maxHeight);
    }

    return (lh[lineIndex] = maxHeight * this._fontSizeMult);
  }

  /**
   * Calculate height of line at 'lineIndex'
   * @param {Number} lineIndex index of line to calculate
   * @return {Number}
   */
  getHeightOfLine(lineIndex: number): number {
    return this.getHeightOfLineImpl(lineIndex) * this.lineHeight;
  }

  /**
   * Calculate text box height
   */
  calcTextHeight() {
    let lineHeight,
      height = 0;
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      // //*PMW* commenting out the code that prevent text box from applying line height on the last line. This caused line height to not work in table and menus
      // height +=
      //   i === len - 1 ? this.getHeightOfLineImpl(i) : this.getHeightOfLine(i);

      // *PMW* preventing height to be smaller than selector size.
      lineHeight = this.getHeightOfLine(i);
      height +=
        i === len - 1 && this.lineHeight < 1
          ? lineHeight / this.lineHeight
          : lineHeight;
    }
    return height;
  }

  /**
   * @private
   * @return {Number} Left offset
   */
  _getLeftOffset(): number {
    return this.direction === LTR ? -this.width / 2 : this.width / 2;
  }

  /**
   * @private
   * @return {Number} Top offset
   */
  _getTopOffset(): number {
    return -this.height / 2;
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} method Method name ("fillText" or "strokeText")
   */
  _renderTextCommon(
    ctx: CanvasRenderingContext2D,
    method: 'fillText' | 'strokeText',
  ) {
    ctx.save();
    let lineHeights = 0;
    const left = this._getLeftOffset(),
      top = this._getTopOffset();
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      if (method === 'fillText') {
        this._renderListMarker(
          ctx,
          i,
          left + this._getLineLeftOffset(i),
          top + lineHeights + this.getHeightOfLineImpl(i),
        );
      }
      this._renderTextLine(
        method,
        ctx,
        this._textLines[i],
        left + this._getLineLeftOffset(i),
        top + lineHeights + this.getHeightOfLineImpl(i),
        i,
      );
      lineHeights += this.getHeightOfLine(i);
    }
    ctx.restore();
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextFill(ctx: CanvasRenderingContext2D) {
    if (!this.fill && !this.styleHas(FILL)) {
      return;
    }

    this._renderTextCommon(ctx, 'fillText');
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextStroke(ctx: CanvasRenderingContext2D) {
    if ((!this.stroke || this.strokeWidth === 0) && this.isEmptyStyles()) {
      return;
    }

    if (this.shadow && !this.shadow.affectStroke) {
      this._removeShadow(ctx);
    }

    ctx.save();
    this._setLineDash(ctx, this.strokeDashArray);
    ctx.beginPath();
    this._renderTextCommon(ctx, 'strokeText');
    ctx.closePath();
    ctx.restore();
  }

  /**
   * @private
   * @param {String} method fillText or strokeText.
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Array} line Content of the line, split in an array by grapheme
   * @param {Number} left
   * @param {Number} top
   * @param {Number} lineIndex
   */
  _renderChars(
    method: 'fillText' | 'strokeText',
    ctx: CanvasRenderingContext2D,
    line: Array<any>,
    left: number,
    top: number,
    lineIndex: number,
  ) {
    const isJustify = this.textAlign.includes(JUSTIFY),
      path = this.path,
      shortCut =
        !isJustify &&
        this.charSpacing === 0 &&
        this.isEmptyStyles(lineIndex) &&
        !path,
      isLtr = this.direction === LTR,
      sign = this.direction === LTR ? 1 : -1,
      // this was changed in the PR #7674
      // currentDirection = ctx.canvas.getAttribute('dir');
      currentDirection = ctx.direction;

    let actualStyle,
      nextStyle,
      charsToRender = '',
      charBox,
      boxWidth = 0,
      timeToRender,
      drawingLeft;

    ctx.save();
    if (currentDirection !== this.direction) {
      ctx.canvas.setAttribute('dir', isLtr ? LTR : RTL);
      ctx.direction = isLtr ? LTR : RTL;
      ctx.textAlign = isLtr ? LEFT : RIGHT;
    }
    top -= this.getHeightOfLineImpl(lineIndex) * this._fontSizeFraction;
    if (shortCut) {
      // render all the line in one pass without checking
      // drawingLeft = isLtr ? left : left - this.getLineWidth(lineIndex);
      this._renderChar(method, ctx, lineIndex, 0, line.join(''), left, top);
      ctx.restore();
      return;
    }
    for (let i = 0, len = line.length - 1; i <= len; i++) {
      timeToRender = i === len || this.charSpacing || path;
      charsToRender += line[i];
      charBox = this.__charBounds[lineIndex][i] as Required<GraphemeBBox>;
      if (boxWidth === 0) {
        left += sign * (charBox.kernedWidth - charBox.width);
        boxWidth += charBox.width;
      } else {
        boxWidth += charBox.kernedWidth;
      }
      if (isJustify && !timeToRender) {
        if (this._reSpaceAndTab.test(line[i])) {
          timeToRender = true;
        }
      }
      if (!timeToRender) {
        // if we have charSpacing, we render char by char
        actualStyle =
          actualStyle || this.getCompleteStyleDeclaration(lineIndex, i);
        nextStyle = this.getCompleteStyleDeclaration(lineIndex, i + 1);
        timeToRender = hasStyleChanged(actualStyle, nextStyle, false);
      }
      if (timeToRender) {
        if (path) {
          ctx.save();
          ctx.translate(charBox.renderLeft, charBox.renderTop);
          ctx.rotate(charBox.angle);
          this._renderChar(
            method,
            ctx,
            lineIndex,
            i,
            charsToRender,
            -boxWidth / 2,
            0,
          );
          ctx.restore();
        } else {
          drawingLeft = left;
          this._renderChar(
            method,
            ctx,
            lineIndex,
            i,
            charsToRender,
            drawingLeft,
            top,
          );
        }
        charsToRender = '';
        actualStyle = nextStyle;
        left += sign * boxWidth;
        boxWidth = 0;
      }
    }
    ctx.restore();
  }

  /**
   * This function try to patch the missing gradientTransform on canvas gradients.
   * transforming a context to transform the gradient, is going to transform the stroke too.
   * we want to transform the gradient but not the stroke operation, so we create
   * a transformed gradient on a pattern and then we use the pattern instead of the gradient.
   * this method has drawbacks: is slow, is in low resolution, needs a patch for when the size
   * is limited.
   * @private
   * @param {TFiller} filler a fabric gradient instance
   * @return {CanvasPattern} a pattern to use as fill/stroke style
   */
  _applyPatternGradientTransformText(filler: TFiller) {
    // TODO: verify compatibility with strokeUniform
    const width = this.width + this.strokeWidth,
      height = this.height + this.strokeWidth,
      pCanvas = createCanvasElementFor({
        width,
        height,
      }),
      pCtx = pCanvas.getContext('2d')!;
    pCanvas.width = width;
    pCanvas.height = height;
    pCtx.beginPath();
    pCtx.moveTo(0, 0);
    pCtx.lineTo(width, 0);
    pCtx.lineTo(width, height);
    pCtx.lineTo(0, height);
    pCtx.closePath();
    pCtx.translate(width / 2, height / 2);
    pCtx.fillStyle = filler.toLive(pCtx)!;
    this._applyPatternGradientTransform(pCtx, filler);
    pCtx.fill();
    return pCtx.createPattern(pCanvas, 'no-repeat')!;
  }

  handleFiller<T extends 'fill' | 'stroke'>(
    ctx: CanvasRenderingContext2D,
    property: `${T}Style`,
    filler: TFiller | string,
  ): { offsetX: number; offsetY: number } {
    let offsetX: number, offsetY: number;
    if (isFiller(filler)) {
      if (
        (filler as Gradient<'linear'>).gradientUnits === 'percentage' ||
        (filler as Gradient<'linear'>).gradientTransform ||
        (filler as Pattern).patternTransform
      ) {
        // need to transform gradient in a pattern.
        // this is a slow process. If you are hitting this codepath, and the object
        // is not using caching, you should consider switching it on.
        // we need a canvas as big as the current object caching canvas.
        offsetX = -this.width / 2;
        offsetY = -this.height / 2;
        ctx.translate(offsetX, offsetY);
        ctx[property] = this._applyPatternGradientTransformText(filler);
        return { offsetX, offsetY };
      } else {
        // is a simple gradient or pattern
        ctx[property] = filler.toLive(ctx)!;
        return this._applyPatternGradientTransform(ctx, filler);
      }
    } else {
      // is a color
      ctx[property] = filler;
    }
    return { offsetX: 0, offsetY: 0 };
  }

  /**
   * This function prepare the canvas for a stroke style, and stroke and strokeWidth
   * need to be sent in as defined
   * @param {CanvasRenderingContext2D} ctx
   * @param {CompleteTextStyleDeclaration} style with stroke and strokeWidth defined
   * @returns
   */
  _setStrokeStyles(
    ctx: CanvasRenderingContext2D,
    {
      stroke,
      strokeWidth,
    }: Pick<CompleteTextStyleDeclaration, 'stroke' | 'strokeWidth'>,
  ) {
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = this.strokeLineCap;
    ctx.lineDashOffset = this.strokeDashOffset;
    ctx.lineJoin = this.strokeLineJoin;
    ctx.miterLimit = this.strokeMiterLimit;
    return this.handleFiller(ctx, 'strokeStyle', stroke!);
  }

  /**
   * This function prepare the canvas for a ill style, and fill
   * need to be sent in as defined
   * @param {CanvasRenderingContext2D} ctx
   * @param {CompleteTextStyleDeclaration} style with ill defined
   * @returns
   */
  _setFillStyles(ctx: CanvasRenderingContext2D, { fill }: Pick<this, 'fill'>) {
    return this.handleFiller(ctx, 'fillStyle', fill!);
  }

  /**
   * @private
   * @param {String} method
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @param {String} _char
   * @param {Number} left Left coordinate
   * @param {Number} top Top coordinate
   * @param {Number} lineHeight Height of the line
   */
  _renderChar(
    method: 'fillText' | 'strokeText',
    ctx: CanvasRenderingContext2D,
    lineIndex: number,
    charIndex: number,
    _char: string,
    left: number,
    top: number,
  ) {
    const decl = this._getStyleDeclaration(lineIndex, charIndex),
      fullDecl = this.getCompleteStyleDeclaration(lineIndex, charIndex),
      shouldFill = method === 'fillText' && fullDecl.fill,
      shouldStroke =
        method === 'strokeText' && fullDecl.stroke && fullDecl.strokeWidth;

    if (!shouldStroke && !shouldFill) {
      return;
    }
    ctx.save();

    ctx.font = this._getFontDeclaration(fullDecl);

    if (decl.textBackgroundColor) {
      this._removeShadow(ctx);
    }
    // *PMW* a per-character shadow replaces the context shadow for this glyph run;
    // the surrounding save/restore scopes it to the run
    if (decl.shadow) {
      this._setCharShadow(ctx, decl.shadow);
    }
    if (decl.deltaY) {
      top += decl.deltaY;
    }

    if (shouldFill) {
      const fillOffsets = this._setFillStyles(ctx, fullDecl);
      ctx.fillText(
        _char,
        left - fillOffsets.offsetX,
        top - fillOffsets.offsetY,
      );
    }

    if (shouldStroke) {
      const strokeOffsets = this._setStrokeStyles(ctx, fullDecl);
      ctx.strokeText(
        _char,
        left - strokeOffsets.offsetX,
        top - strokeOffsets.offsetY,
      );
    }

    ctx.restore();
  }

  /**
   * Turns the character into a 'superior figure' (i.e. 'superscript')
   * @param {Number} start selection start
   * @param {Number} end selection end
   */
  /**
   * *PMW* Maps a visual (possibly soft-wrapped) line index to the real (unwrapped) line
   * index that keys `styles`' line entries and `lineStyles`. Plain text has no wrapping,
   * so this is the identity; Textbox overrides it through its style map.
   * @private
   */
  _getRealLineIndex(visualLineIndex: number): number {
    return visualLineIndex;
  }

  /**
   * *PMW* The alignment a visual line renders with: its real line's `lineStyles.textAlign`
   * override when present, the object-level `textAlign` otherwise.
   * @private
   */
  _getEffectiveTextAlignForLine(visualLineIndex: number): string {
    return (
      this.lineStyles[this._getRealLineIndex(visualLineIndex)]?.textAlign ||
      this.textAlign
    );
  }

  /**
   * *PMW* Whether a visual line is the first visual row of its real (unwrapped) line — where a
   * list marker draws. Plain text has no wrapping, so always true; Textbox overrides.
   * @private
   */
  _isStartOfRealLine(_visualLineIndex: number): boolean {
    return true;
  }

  /**
   * *PMW* Where a real line's text column DRAWS, in text units (the line offset and, through
   * it, the marker renderer). A migrated legacy list row (explicit `leftIndent` AND a marker)
   * draws at the legacy gutter — the live-measured widest marker plus the gap, exactly what the
   * legacy renderer computed on every load — so its text lands where it always did even though
   * the row RESERVES the migration's estimate of that gutter ({@link _getRealLineReservedWidth}).
   * A plain explicit `leftIndent` draws at that indent; an auto list row at the shared gutter.
   * @private
   */
  _getRealLineIndent(realLineIndex: number): number {
    const record = this.lineStyles[realLineIndex];
    if (!record) {
      return 0;
    }
    if (typeof record.leftIndent === 'number') {
      return record.listMarker
        ? this._getLegacyListGutterWidth()
        : record.leftIndent;
    }
    if (record.listMarker) {
      return this._getAutoListGutterWidth();
    }
    return 0;
  }

  /**
   * *PMW* How much of the box width a real line RESERVES for its gutter, in text units: the
   * explicit `leftIndent` when set (a migrated row's legacy gutter estimate — this is what keeps
   * its wrap width `width − leftIndent` identical to the legacy text area), else the shared auto
   * gutter of a list row, else 0. Consumed by the Textbox wrap, justify and the alignment free
   * space; the drawn column is {@link _getRealLineIndent}.
   * @private
   */
  _getRealLineReservedWidth(realLineIndex: number): number {
    const record = this.lineStyles[realLineIndex];
    if (!record) {
      return 0;
    }
    if (typeof record.leftIndent === 'number') {
      return record.leftIndent;
    }
    if (record.listMarker) {
      return this._getAutoListGutterWidth();
    }
    return 0;
  }

  /**
   * *PMW* The legacy renderer's gutter for the box's migrated list rows (explicit `leftIndent`
   * AND a marker): its single bullets textbox was as wide as the widest marker, and the text sat
   * one gap right of it — no floor. Un-floored on purpose: a migrated "1."–"9." list keeps its
   * narrower-than-floor column.
   * @private
   */
  _getLegacyListGutterWidth(): number {
    this.__listGutterWidths ??= {};
    if (this.__listGutterWidths.legacy === undefined) {
      this.__listGutterWidths.legacy = this._computeLegacyListGutterWidth();
    }
    return this.__listGutterWidths.legacy;
  }

  _computeLegacyListGutterWidth(): number {
    let gutter = 0;
    for (const key of Object.keys(this.lineStyles)) {
      const realLineIndex = parseInt(key, 10);
      const record = this.lineStyles[realLineIndex];
      if (!record?.listMarker || typeof record.leftIndent !== 'number') {
        continue;
      }
      const { fontSize } = this._getListMarkerStyle(realLineIndex);
      gutter = Math.max(
        gutter,
        this._measureListMarkerWidth(realLineIndex) +
          LIST_MARKER_GAP_FACTOR * fontSize,
      );
    }
    return gutter;
  }

  /**
   * *PMW* One shared gutter for every auto-indented list row of the textbox: the
   * {@link LIST_GUTTER_EM_FACTOR} floor, widened only by a marker that does not fit it. Rows with
   * an explicit leftIndent (the fork's raw-key capability) do not participate — their own indent
   * wins in {@link _getRealLineIndent}. The floor is what makes the text column identical across
   * bullet and numbered rows and across separate textboxes of the same font size; the max keeps
   * long ordinals ("10.") from colliding with their text.
   *
   * Memoized per layout (see {@link _clearCache}): the alignment and wrap code asks for the
   * gutter once per visual line per render pass, and a fresh walk over every list record each
   * time made list rendering quadratic in the row count (601ms a frame at 120 rows).
   * @private
   */
  _getAutoListGutterWidth(): number {
    this.__listGutterWidths ??= {};
    if (this.__listGutterWidths.auto === undefined) {
      this.__listGutterWidths.auto = this._computeAutoListGutterWidth();
    }
    return this.__listGutterWidths.auto;
  }

  _computeAutoListGutterWidth(): number {
    let gutter = 0;
    for (const key of Object.keys(this.lineStyles)) {
      const realLineIndex = parseInt(key, 10);
      const record = this.lineStyles[realLineIndex];
      if (!record?.listMarker || typeof record.leftIndent === 'number') {
        continue;
      }
      const { fontSize } = this._getListMarkerStyle(realLineIndex);
      gutter = Math.max(
        gutter,
        LIST_GUTTER_EM_FACTOR * fontSize,
        this._measureListMarkerWidth(realLineIndex) +
          LIST_MARKER_GAP_FACTOR * fontSize,
      );
    }
    return gutter;
  }

  /**
   * *PMW* The font/fill a real line's list marker renders with: the record's own marker keys,
   * falling back to the line's first character's effective style.
   * @private
   */
  _getListMarkerStyle(realLineIndex: number): {
    fontSize: number;
    fontFamily: string;
    fill: string;
  } {
    const record = this.lineStyles[realLineIndex] || {};
    const firstCharStyle = this.styles[realLineIndex]?.[0] || {};
    const fill =
      (typeof record.listMarkerFill === 'string' && record.listMarkerFill) ||
      getMarkerColorFromFill(firstCharStyle.fill) ||
      getMarkerColorFromFill(this.fill) ||
      '#000000';
    return {
      fontSize: firstCharStyle.fontSize ?? this.fontSize,
      fontFamily:
        (typeof record.listMarkerFontFamily === 'string' &&
          record.listMarkerFontFamily) ||
        firstCharStyle.fontFamily ||
        this.fontFamily,
      fill,
    };
  }

  /**
   * *PMW* Measured width of a real line's list marker in text units. Memoized per layout
   * (see {@link _clearCache}); the gutter walks and the marker render share the measurement.
   * @private
   */
  _measureListMarkerWidth(realLineIndex: number): number {
    const marker = this.lineStyles[realLineIndex]?.listMarker;
    if (!marker) {
      return 0;
    }
    this.__listMarkerWidths ??= {};
    const memoized = this.__listMarkerWidths[realLineIndex];
    if (memoized !== undefined) {
      return memoized;
    }
    const width = this._computeListMarkerWidth(realLineIndex, String(marker));
    this.__listMarkerWidths[realLineIndex] = width;
    return width;
  }

  _computeListMarkerWidth(realLineIndex: number, marker: string): number {
    const { fontSize, fontFamily } = this._getListMarkerStyle(realLineIndex);
    const ctx = getMeasuringContext()!;
    // measure at CACHE_FONT_SIZE like _measureChar does, then scale to the marker's font size
    ctx.font = this._getFontDeclaration({ fontSize, fontFamily }, true);
    return (ctx.measureText(marker).width * fontSize) / this.CACHE_FONT_SIZE;
  }

  /**
   * *PMW* Draws a real line's list marker in the gutter left of its first visual row, on the
   * fill pass. `lineDrawLeft`/`lineDrawTop` are the row's own draw anchors.
   * @private
   */
  _renderListMarker(
    ctx: CanvasRenderingContext2D,
    visualLineIndex: number,
    lineDrawLeft: number,
    lineDrawTop: number,
  ) {
    if (!this._isStartOfRealLine(visualLineIndex)) {
      return;
    }
    const realLineIndex = this._getRealLineIndex(visualLineIndex);
    const marker = this.lineStyles[realLineIndex]?.listMarker;
    if (!marker) {
      return;
    }
    const { fontSize, fontFamily, fill } =
      this._getListMarkerStyle(realLineIndex);
    // LTR: right-aligned in the LEFT gutter (like the legacy bullets textbox) — the marker's
    // right edge sits a fixed gap from the text column, so ordinal periods line up and digits
    // grow left. RTL mirrors: the gutter (and the marker) sit RIGHT of the text, whose draw
    // anchor is its right edge there.
    const gap = LIST_MARKER_GAP_FACTOR * fontSize;
    const markerLeft =
      this.direction === RTL
        ? lineDrawLeft + gap
        : lineDrawLeft - gap - this._measureListMarkerWidth(realLineIndex);
    ctx.save();
    // markers are direction-neutral ordinals/glyphs; pin the ctx so an inherited RTL canvas
    // state cannot re-anchor or reorder them
    ctx.direction = LTR;
    ctx.textAlign = LEFT;
    ctx.font = this._getFontDeclaration({ fontSize, fontFamily });
    ctx.fillStyle = fill;
    const unorderedMarkerRaise = this.lineStyles[realLineIndex]
      ?.listMarkerFontFamily
      ? fontSize / UNORDERED_MARKER_RAISE_FACTOR
      : 0;
    ctx.fillText(
      String(marker),
      markerLeft,
      lineDrawTop -
        this.getHeightOfLineImpl(visualLineIndex) * this._fontSizeFraction -
        unorderedMarkerRaise,
    );
    ctx.restore();
  }

  /**
   * *PMW* Sets or clears (align undefined) one real line's alignment override.
   */
  setLineAlignment(realLineIndex: number, align?: string) {
    const { [realLineIndex]: existing, ...rest } = this.lineStyles;
    const nextRecord = align
      ? { ...rest, [realLineIndex]: { ...existing, textAlign: align } }
      : existing && Object.keys(existing).length > 1
        ? (() => {
            const { textAlign: _cleared, ...keptKeys } = existing;
            return { ...rest, [realLineIndex]: keptKeys };
          })()
        : rest;
    this.set('lineStyles', nextRecord);
  }

  /**
   * *PMW* The alignment the given real line renders with.
   */
  getLineAlignment(realLineIndex: number): string {
    return (
      (this.lineStyles[realLineIndex]?.textAlign as string) || this.textAlign
    );
  }

  /**
   * *PMW* Applies (or clears, when align is undefined) an alignment override to every real
   * line the grapheme range [start, end) touches.
   */
  setSelectionAlignment(start: number, end: number, align?: string) {
    const firstLine = this.get2DCursorLocation(start, true).lineIndex;
    const lastLine = this.get2DCursorLocation(
      Math.max(start, end - 1),
      true,
    ).lineIndex;
    for (let line = firstLine; line <= lastLine; line++) {
      this.setLineAlignment(line, align);
    }
  }

  setSuperscript(start: number, end: number) {
    this._setScript(start, end, this.superscript);
  }

  /**
   * Turns the character into an 'inferior figure' (i.e. 'subscript')
   * @param {Number} start selection start
   * @param {Number} end selection end
   */
  setSubscript(start: number, end: number) {
    this._setScript(start, end, this.subscript);
  }

  /**
   * Applies 'schema' at given position
   * @private
   * @param {Number} start selection start
   * @param {Number} end selection end
   * @param {Number} schema
   */
  protected _setScript(
    start: number,
    end: number,
    schema: {
      size: number;
      baseline: number;
    },
  ) {
    const loc = this.get2DCursorLocation(start, true),
      fontSize = this.getValueOfPropertyAt(
        loc.lineIndex,
        loc.charIndex,
        'fontSize',
      ),
      dy = this.getValueOfPropertyAt(loc.lineIndex, loc.charIndex, 'deltaY'),
      style = {
        fontSize: fontSize * schema.size,
        deltaY: dy + fontSize * schema.baseline,
      };
    this.setSelectionStyles(style, start, end);
  }

  /**
   * @private
   * @param {Number} lineIndex index text line
   * @return {Number} Line left offset
   */
  _getLineLeftOffset(lineIndex: number): number {
    const lineWidth = this.getLineWidth(lineIndex),
      // *PMW* a line's own alignment override wins over the object-level textAlign
      textAlign = this._getEffectiveTextAlignForLine(lineIndex),
      direction = this.direction,
      isEndOfWrapping = this.isEndOfWrapping(lineIndex),
      realLineIndex = this._getRealLineIndex(lineIndex),
      indentMagnitude = this._getRealLineIndent(realLineIndex),
      // *PMW* alignment distributes only the space left of the RESERVED gutter, so the
      // marker+text unit centers and right-aligns inside the box instead of overflowing
      lineDiff =
        this.width - lineWidth - this._getRealLineReservedWidth(realLineIndex),
      // signed so RTL lines indent inward from their right edge; 0 stays +0
      lineIndent = (direction === RTL ? -1 : 1) * indentMagnitude + 0;
    let leftOffset = 0;
    if (
      textAlign === JUSTIFY ||
      (textAlign === JUSTIFY_CENTER && !isEndOfWrapping) ||
      (textAlign === JUSTIFY_RIGHT && !isEndOfWrapping) ||
      (textAlign === JUSTIFY_LEFT && !isEndOfWrapping)
    ) {
      return lineIndent;
    }
    if (textAlign === CENTER) {
      leftOffset = lineDiff / 2;
    }
    if (textAlign === RIGHT) {
      leftOffset = lineDiff;
    }
    if (textAlign === JUSTIFY_CENTER) {
      leftOffset = lineDiff / 2;
    }
    if (textAlign === JUSTIFY_RIGHT) {
      leftOffset = lineDiff;
    }
    if (direction === RTL) {
      if (textAlign === RIGHT || textAlign === JUSTIFY_RIGHT) {
        leftOffset = 0;
      } else if (textAlign === LEFT || textAlign === JUSTIFY_LEFT) {
        leftOffset = -lineDiff;
      } else if (textAlign === CENTER || textAlign === JUSTIFY_CENTER) {
        leftOffset = -lineDiff / 2;
      }
    }
    return leftOffset + lineIndent;
  }

  /**
   * @private
   */
  _clearCache() {
    this._forceClearCache = false;
    this.__lineWidths = [];
    this.__lineHeights = [];
    this.__charBounds = [];
    this.__glyphOverhang = undefined;
    this.__listMarkerWidths = {};
    this.__listGutterWidths = {};
  }

  /**
   * Measure a single line given its index. Used to calculate the initial
   * text bounding box. The values are calculated and stored in __lineWidths cache.
   * @private
   * @param {Number} lineIndex line number
   * @return {Number} Line width
   */
  getLineWidth(lineIndex: number): number {
    if (this.__lineWidths[lineIndex] !== undefined) {
      return this.__lineWidths[lineIndex];
    }

    const { width } = this.measureLine(lineIndex);
    this.__lineWidths[lineIndex] = width;
    return width;
  }

  _getWidthOfCharSpacing() {
    //*PMW* change char spacing to be applied the same on every size
    // if (this.charSpacing !== 0) {
    //   return this.fontSize * this.charSpacing / 1000;
    // }
    return this.charSpacing;
  }

  /**
   * Retrieves the value of property at given character position
   * @param {Number} lineIndex the line number
   * @param {Number} charIndex the character number
   * @param {String} property the property name
   * @returns the value of 'property'
   */
  getValueOfPropertyAt<T extends StylePropertiesType>(
    lineIndex: number,
    charIndex: number,
    property: T,
  ): this[T] {
    const charStyle = this._getStyleDeclaration(lineIndex, charIndex);
    return (charStyle[property] ?? this[property]) as this[T];
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextDecoration(
    ctx: CanvasRenderingContext2D,
    type: 'underline' | 'linethrough' | 'overline' | 'squigglyline',
  ) {
    if (!this[type] && !this.styleHas(type)) {
      return;
    }
    let topOffset = this._getTopOffset();
    const leftOffset = this._getLeftOffset(),
      path = this.path,
      charSpacing = this._getWidthOfCharSpacing(),
      offsetAligner =
        type === 'linethrough' ? 0.5 : type === 'overline' ? 1 : 0,
      offsetY = this.offsets[type];
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const heightOfLine = this.getHeightOfLine(i);
      if (!this[type] && !this.styleHas(type, i)) {
        topOffset += heightOfLine;
        continue;
      }
      const line = this._textLines[i];
      const maxHeight = heightOfLine / this.lineHeight;
      const lineLeftOffset = this._getLineLeftOffset(i);
      let boxStart = 0;
      let boxWidth = 0;
      let lastDecoration = this.getValueOfPropertyAt(i, 0, type);
      let lastFill = this.getValueOfPropertyAt(i, 0, FILL);
      let lastDecorationColor =
        this.getValueOfPropertyAt(i, 0, TEXT_DECORATION_COLOR) || lastFill;
      let lastTickness = this.getValueOfPropertyAt(
        i,
        0,
        TEXT_DECORATION_THICKNESS,
      );
      // *PMW* a decoration inherits its characters' per-character shadow
      let lastShadow = this.getValueOfPropertyAt(i, 0, 'shadow');
      let currentDecoration = lastDecoration;
      let currentFill: typeof lastFill = lastFill;
      let currentDecorationColor = lastDecorationColor;
      let currentTickness = lastTickness;
      let currentShadow = lastShadow;
      const top = topOffset + maxHeight * (1 - this._fontSizeFraction);
      let size = this.getHeightOfChar(i, 0);
      let dy = this.getValueOfPropertyAt(i, 0, 'deltaY');
      for (let j = 0, jlen = line.length; j < jlen; j++) {
        const charBox = this.__charBounds[i][j] as Required<GraphemeBBox>;
        currentDecoration = this.getValueOfPropertyAt(i, j, type);
        currentFill = this.getValueOfPropertyAt(i, j, FILL);
        currentDecorationColor =
          this.getValueOfPropertyAt(i, j, TEXT_DECORATION_COLOR) || currentFill;
        currentTickness = this.getValueOfPropertyAt(
          i,
          j,
          TEXT_DECORATION_THICKNESS,
        );
        currentShadow = this.getValueOfPropertyAt(i, j, 'shadow');
        const currentSize = this.getHeightOfChar(i, j);
        const currentDy = this.getValueOfPropertyAt(i, j, 'deltaY');
        if (path && currentDecoration && currentFill) {
          const finalTickness = (this.fontSize * currentTickness) / 1000;
          ctx.save();
          if (currentShadow) {
            this._setCharShadow(ctx, currentShadow);
          }
          // bug? verify lastFill is a valid fill here.
          ctx.fillStyle = this.getFillForTextDecoration(
            ctx,
            type,
            lastFill as string,
          );
          ctx.translate(charBox.renderLeft, charBox.renderTop);
          ctx.rotate(charBox.angle);
          this.fillTextDecorationRect(
            ctx,
            type,
            -charBox.kernedWidth / 2,
            offsetY * currentSize + currentDy - offsetAligner * finalTickness,
            charBox.kernedWidth,
            finalTickness,
            currentSize,
          );
          ctx.restore();
        } else if (
          (currentDecoration !== lastDecoration ||
            currentFill !== lastFill ||
            currentDecorationColor !== lastDecorationColor ||
            currentSize !== size ||
            currentTickness !== lastTickness ||
            !deepPlainValuesEqual(currentShadow, lastShadow) ||
            currentDy !== dy) &&
          boxWidth > 0
        ) {
          const finalTickness = (this.fontSize * lastTickness) / 1000;
          let drawStart = leftOffset + lineLeftOffset + boxStart;
          if (this.direction === RTL) {
            drawStart = this.width - drawStart - boxWidth;
          }
          if (lastDecoration && lastFill && lastTickness) {
            if (lastShadow) {
              ctx.save();
              this._setCharShadow(ctx, lastShadow);
            }
            // bug? verify lastFill is a valid fill here.
            ctx.fillStyle = this.getFillForTextDecoration(
              ctx,
              type,
              lastFill as string,
            );
            this.fillTextDecorationRect(
              ctx,
              type,
              drawStart,
              top + offsetY * size + dy - offsetAligner * finalTickness,
              boxWidth,
              finalTickness,
              size,
            );
            if (lastShadow) {
              ctx.restore();
            }
          }
          boxStart = charBox.left;
          boxWidth = charBox.width;
          lastDecoration = currentDecoration;
          lastDecorationColor = currentDecorationColor;
          lastTickness = currentTickness;
          lastFill = currentFill;
          lastShadow = currentShadow;
          size = currentSize;
          dy = currentDy;
        } else {
          boxWidth += charBox.kernedWidth;
        }
      }
      let drawStart = leftOffset + lineLeftOffset + boxStart;
      if (this.direction === RTL) {
        drawStart = this.width - drawStart - boxWidth;
      }
      if (currentShadow) {
        ctx.save();
        this._setCharShadow(ctx, currentShadow);
      }
      ctx.fillStyle = this.getFillForTextDecoration(
        ctx,
        type,
        currentFill as string,
      );
      const finalTickness = (this.fontSize * currentTickness) / 1000;
      currentDecoration &&
        currentDecorationColor &&
        currentTickness &&
        this.fillTextDecorationRect(
          ctx,
          type,
          drawStart,
          top + offsetY * size + dy - offsetAligner * finalTickness,
          boxWidth - charSpacing,
          finalTickness,
          size,
        );
      if (currentShadow) {
        ctx.restore();
      }
      topOffset += heightOfLine;
    }

    // if there is text background color no
    // other shadows should be casted
    // *PMW* need shadow to be applied on text with styles as well,
    // this._removeShadow(ctx);
  }

  /**
   *  *PMW*
   * Handle squigglyline. `fontSize` is the decorated run's font size: the squiggle's wave
   * and dots scale with it (see {@link fillSquigglyLine}), the other decorations ignore it.
   * @private
   */
  private fillTextDecorationRect(
    ctx: CanvasRenderingContext2D,
    type: 'underline' | 'linethrough' | 'overline' | 'squigglyline',
    x: number,
    y: number,
    w: number,
    h: number,
    fontSize: number,
  ) {
    if (type === 'squigglyline') {
      this.fillSquigglyLine(ctx, x, y, w, fontSize);
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }

  /**
   * *PMW* A dotted triangle wave under a misspelled run, in the run's proportions: the wave
   * that used to be drawn at fixed pixel sizes (sized for ~{@link SQUIGGLY_LINE_REFERENCE_FONT_SIZE}px
   * text) now scales with the font size, so an 11px caption gets a squiggle a quarter the size
   * of a 45px heading's instead of one taller than its x-height. The dot never drops below one
   * DEVICE pixel so tiny text still shows a line — measured through the context transform, not
   * in text units: a 5px font scaled up 3.5× draws in big text units, and a one-unit floor there
   * made the dot as tall as the whole wave.
   * @private
   */
  private fillSquigglyLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    fontSize: number,
  ) {
    const scale = fontSize / SQUIGGLY_LINE_REFERENCE_FONT_SIZE;
    const dot = Math.max(
      SQUIGGLY_LINE_DOT_SIZE * scale,
      this._getTextUnitsPerDevicePixel(ctx),
    );
    const step = SQUIGGLY_LINE_DOT_STEP * scale;
    for (let dx = 0; dx < w; dx += step) {
      const phase = (dx / scale) * SQUIGGLY_LINE_WAVE_FREQUENCY;
      const period = phase % SQUIGGLY_LINE_WAVE_PERIOD;
      const rise =
        period <= SQUIGGLY_LINE_WAVE_PERIOD / 2
          ? period
          : SQUIGGLY_LINE_WAVE_PERIOD - period;
      ctx.fillRect(
        x + dx - SQUIGGLY_LINE_LEAD_IN * scale,
        y + rise * SQUIGGLY_LINE_WAVE_RISE_FACTOR * scale,
        dot,
        dot,
      );
    }
  }

  /**
   * *PMW* How many text units one device pixel spans under the context's current transform
   * (object scale × viewport zoom × device pixel ratio, cache canvases included). 1 when the
   * context cannot report its transform.
   * @private
   */
  private _getTextUnitsPerDevicePixel(ctx: CanvasRenderingContext2D): number {
    if (typeof ctx.getTransform !== 'function') {
      return 1;
    }
    const { a, b } = ctx.getTransform();
    const devicePixelsPerUnit = Math.sqrt(a * a + b * b);
    return devicePixelsPerUnit > 0 ? 1 / devicePixelsPerUnit : 1;
  }

  /**
   *  *PMW*
   * Handle squigglyline, gradient fill and pattern fill for text decoration
   * @private
   */
  private getFillForTextDecoration(
    ctx: CanvasRenderingContext2D,
    type: 'underline' | 'linethrough' | 'overline' | 'squigglyline',
    fill: string | TFiller | null,
  ): CanvasPattern | string {
    if (type === 'squigglyline') {
      return this.squigglylineColor;
    }

    if (
      fill &&
      typeof fill !== 'string' &&
      'colorStops' in fill &&
      fill.colorStops.length
    ) {
      return fill.colorStops[0].color;
    } else if (fill && typeof fill !== 'string' && 'source' in fill) {
      //Use pattern for underline, linethrough on text mask
      const pattern = ctx.createPattern(fill.source, 'repeat');
      if (pattern) {
        return pattern;
      }
    }

    return fill as string;
  }

  /**
   * *PMW*
   * Draws a background for the object big as its untrasformed dimensions
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderBackground(ctx: CanvasRenderingContext2D) {
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

    ctx.fillRect(
      -dim.x / 2 - this.padding / scaleX,
      -dim.y / 2 - this.padding / scaleY,
      dim.x + (this.padding / scaleX) * 2,
      dim.y + (this.padding / scaleY) * 2,
    );
    // if there is background color no other shadows
    // should be casted
    this._removeShadow(ctx);
  }

  getCharOffset(position: number) {
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
    if (
      this.charSpacing !== 0 &&
      charIndex === this._textLines[lineIndex].length
    ) {
      leftOffset -= this._getWidthOfCharSpacing();
    }
    return {
      x: lineLeftOffset + (leftOffset > 0 ? leftOffset : 0),
      y: topOffset,
    };
  }

  /**
   * *PMW*
   * Find new selection index representing start of current word according to current selection index
   * @param {Number} startFrom Current selection index
   * @return {Number} selection start index
   */
  findSelectedWordLeft(startFrom: number): number {
    let offset = 0,
      index = startFrom - 1;

    while (/[^\n -&(-/:-@[-`{-~0-9]/.test(this._text[index]) && index > -1) {
      offset++;
      index--;
    }

    return startFrom - offset;
  }

  /**
   * *PMW*
   * Find new selection index representing end of current word according to current selection index
   * @param {Number} startFrom Current selection index
   * @return {Number} selection end index
   */
  findSelectedWordRight(startFrom: number): number {
    let offset = 0,
      index = startFrom;

    while (
      /[^\n -&(-/:-@[-`{-~0-9]/.test(this._text[index]) &&
      index < this._text.length
    ) {
      offset++;
      index++;
    }

    return startFrom + offset;
  }

  /**
   * return font declaration string for canvas context
   * @param {Object} [styleObject] object
   * @returns {String} font declaration formatted for canvas context.
   */
  _getFontDeclaration(
    {
      fontFamily = this.fontFamily,
      fontStyle = this.fontStyle,
      fontWeight = this.fontWeight,
      fontSize = this.fontSize,
    }: Partial<
      Pick<
        TextStyleDeclaration,
        'fontFamily' | 'fontStyle' | 'fontWeight' | 'fontSize'
      >
    > = {},
    forMeasuring?: boolean,
  ): string {
    const parsedFontFamily =
      fontFamily.includes("'") ||
      fontFamily.includes('"') ||
      fontFamily.includes(',') ||
      FabricText.genericFonts.includes(fontFamily.toLowerCase())
        ? fontFamily
        : `"${fontFamily}"`;
    return [
      fontStyle,
      fontWeight,
      `${forMeasuring ? this.CACHE_FONT_SIZE : fontSize}px`,
      parsedFontFamily,
    ].join(' ');
  }

  /**
   * Renders text instance on a specified context
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  render(ctx: CanvasRenderingContext2D) {
    if (!this.visible) {
      return;
    }
    if (
      this.canvas &&
      this.canvas.skipOffscreen &&
      !this.group &&
      !this.isOnScreen()
    ) {
      return;
    }
    if (this._forceClearCache) {
      this.initDimensions();
    }
    super.render(ctx);
  }

  /**
   * Override this method to customize grapheme splitting
   * @todo the util `graphemeSplit` needs to be injectable in some way.
   * is more comfortable to inject the correct util rather than having to override text
   * in the middle of the prototype chain
   * @param {string} value
   * @returns {string[]} array of graphemes
   */
  graphemeSplit(value: string): string[] {
    return graphemeSplit(value);
  }

  /**
   * Returns the text as an array of lines.
   * @param {String} text text to split
   * @returns  Lines in the text
   */
  _splitTextIntoLines(text: string): TextLinesInfo {
    const lines = text.split(this._reNewline),
      newLines = new Array<string[]>(lines.length),
      newLine = ['\n'];
    let newText: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      newLines[i] = this.graphemeSplit(lines[i]);
      newText = newText.concat(newLines[i], newLine);
    }
    newText.pop();
    return {
      _unwrappedLines: newLines,
      lines: lines,
      graphemeText: newText,
      graphemeLines: newLines,
    };
  }

  /**
   * Returns object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} Object representation of an instance
   */
  toObject<
    T extends Omit<Props & TClassProperties<this>, keyof SProps>,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SProps {
    return {
      ...super.toObject([...additionalProps, ...propertiesToInclude] as K[]),
      styles: stylesToArray(this.styles, this.text),
      ...(this.path ? { path: this.path.toObject() } : {}),
    };
  }

  set(key: string | any, value?: any) {
    const { textLayoutProperties } = this.constructor as typeof FabricText;
    super.set(key, value);
    let needsDims = false;
    let isAddingPath = false;
    if (typeof key === 'object') {
      for (const _key in key) {
        if (_key === 'path') {
          this.setPathInfo();
        }
        needsDims = needsDims || textLayoutProperties.includes(_key);
        isAddingPath = isAddingPath || _key === 'path';
      }
    } else {
      needsDims = textLayoutProperties.includes(key);
      isAddingPath = key === 'path';
    }
    if (isAddingPath) {
      this.setPathInfo();
    }
    if (needsDims && this.initialized) {
      this.initDimensions();
      this.setCoords();
    }
    return this;
  }

  /**
   * Returns complexity of an instance
   * @return {Number} complexity
   */
  complexity(): number {
    return 1;
  }

  /**
   * List of generic font families
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font-family#generic-name
   */
  static genericFonts = [
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-serif',
    'ui-sans-serif',
    'ui-monospace',
    'ui-rounded',
    'math',
    'emoji',
    'fangsong',
  ];

  /* _FROM_SVG_START_ */

  /**
   * List of attribute names to account for when parsing SVG element (used by {@link FabricText.fromElement})
   * @see: http://www.w3.org/TR/SVG/text.html#TextElement
   */
  static ATTRIBUTE_NAMES = SHARED_ATTRIBUTES.concat(
    'x',
    'y',
    'dx',
    'dy',
    'font-family',
    'font-style',
    'font-weight',
    'font-size',
    'letter-spacing',
    'text-decoration',
    'text-decoration-thickness',
    'text-decoration-color',
    'text-anchor',
  );

  /**
   * Returns FabricText instance from an SVG element (<b>not yet implemented</b>)
   * @param {HTMLElement} element Element to parse
   * @param {Object} [options] Options object
   */
  static async fromElement(
    element: HTMLElement | SVGElement,
    options?: Abortable,
    cssRules?: CSSRules,
  ) {
    const parsedAttributes = parseAttributes(
      element,
      FabricText.ATTRIBUTE_NAMES,
      cssRules,
    );

    const {
      textAnchor = LEFT as typeof LEFT | typeof CENTER | typeof RIGHT,
      textDecoration = '',
      dx = 0,
      dy = 0,
      top = 0,
      left = 0,
      fontSize = DEFAULT_SVG_FONT_SIZE,
      strokeWidth = 1,
      ...restOfOptions
    } = { ...options, ...parsedAttributes };

    const textContent = normalizeWs(element.textContent || '').trim();

    // this code here is probably the usual issue for SVG center find
    // this can later looked at again and probably removed.

    const text = new this(textContent, {
        left: left + dx,
        top: top + dy,
        underline: textDecoration.includes('underline'),
        overline: textDecoration.includes('overline'),
        linethrough: textDecoration.includes('line-through'),
        /*PMW*/
        squigglyline: textDecoration.includes('squiggly-line'),
        // we initialize this as 0
        strokeWidth: 0,
        fontSize,
        ...restOfOptions,
      }),
      textHeightScaleFactor = text.getScaledHeight() / text.height,
      lineHeightDiff =
        (text.height + text.strokeWidth) * text.lineHeight - text.height,
      scaledDiff = lineHeightDiff * textHeightScaleFactor,
      textHeight = text.getScaledHeight() + scaledDiff;

    let offX = 0;
    /*
      Adjust positioning:
        x/y attributes in SVG correspond to the bottom-left corner of text bounding box
        fabric output by default at top, left.
    */
    if (textAnchor === CENTER) {
      offX = text.getScaledWidth() / 2;
    }
    if (textAnchor === RIGHT) {
      offX = text.getScaledWidth();
    }
    text.set({
      left: text.left - offX,
      top:
        text.top -
        (textHeight - text.fontSize * (0.07 + text._fontSizeFraction)) /
          text.lineHeight,
      strokeWidth,
    });
    return text;
  }

  /* _FROM_SVG_END_ */

  /**
   * Returns FabricText instance from an object representation
   * @param {Object} object plain js Object to create an instance from
   * @returns {Promise<FabricText>}
   */
  static fromObject<
    T extends TOptions<SerializedTextProps>,
    S extends FabricText,
  >(object: T) {
    return this._fromObject<S>(
      {
        ...object,
        styles: stylesFromArray(object.styles || {}, object.text || ''),
      },
      {
        extraParam: 'text',
      },
    );
  }
}

applyMixins(FabricText, [TextSVGExportMixin]);
classRegistry.setClass(FabricText);
classRegistry.setSVGClass(FabricText);
