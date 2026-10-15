import type { GlyphInkBounds } from '../../cache';
import type { NORMAL } from '../../constants';
import type { ObjectEvents } from '../../EventTypeDefs';
import type { CompleteTextStyleDeclaration, TextStyle, TextStyleDeclaration } from './StyledText';
import { StyledText } from './StyledText';
import type { Abortable, TCacheCanvasDimensions, TClassProperties, TFiller, TOptions } from '../../typedefs';
import type { TextStyleArray } from '../../util/misc/textStyles';
import type { Path } from '../Path';
import type { FabricObjectProps, SerializedObjectProps } from '../Object/types';
import type { StylePropertiesType } from './constants';
import { JUSTIFY, JUSTIFY_CENTER, JUSTIFY_LEFT, JUSTIFY_RIGHT } from './constants';
import { CENTER, LEFT, RIGHT } from '../../constants';
import type { CSSRules } from '../../parser/typedefs';
export type TPathSide = 'left' | 'right';
export type TPathAlign = 'baseline' | 'center' | 'ascender' | 'descender';
export type TextLinesInfo = {
    lines: string[];
    graphemeLines: string[][];
    graphemeText: string[];
    _unwrappedLines: string[][];
};
export type TextAlign = typeof LEFT | typeof CENTER | typeof RIGHT | typeof JUSTIFY | typeof JUSTIFY_LEFT | typeof JUSTIFY_CENTER | typeof JUSTIFY_RIGHT;
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
/** *PMW* A list marker resolved to its draw position and style, in text units. */
export type TListMarkerPlacement = {
    marker: string;
    fontSize: number;
    fontFamily: string;
    fill: string;
    left: number;
    baseline: number;
};
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
export interface SerializedTextProps extends SerializedObjectProps, UniqueTextProps {
    styles: TextStyleArray | TextStyle;
}
export interface TextProps extends FabricObjectProps, UniqueTextProps {
    styles: TextStyle;
}
export declare class FabricText<Props extends TOptions<TextProps> = Partial<TextProps>, SProps extends SerializedTextProps = SerializedTextProps, EventSpec extends ObjectEvents = ObjectEvents> extends StyledText<Props, SProps, EventSpec> implements UniqueTextProps {
    /**
     * Properties that requires a text layout recalculation when changed
     * @type string[]
     * @protected
     */
    static textLayoutProperties: string[];
    /**
     * @private
     */
    _reNewline: RegExp;
    /**
     * Use this regular expression to filter for whitespaces that is not a new line.
     * Mostly used when text is 'justify' aligned.
     * @private
     */
    _reSpacesAndTabs: RegExp;
    /**
     * Use this regular expression to filter for whitespace that is not a new line.
     * Mostly used when text is 'justify' aligned.
     * @private
     */
    _reSpaceAndTab: RegExp;
    /**
     * Use this regular expression to filter consecutive groups of non spaces.
     * Mostly used when text is 'justify' aligned.
     * @private
     */
    _reWords: RegExp;
    text: string;
    /**
     * Font size (in pixels)
     * @type Number
     */
    fontSize: number;
    /**
     * *PMW*
     * Property added to expand text cache canvas more than default expansion for fonts which get cut off.
     */
    cacheExpansionFactor: number;
    /**
     * Font weight (e.g. bold, normal, 400, 600, 800)
     * @type {(Number|String)}
     */
    fontWeight: string | number;
    /**
     * Font family
     * @type String
     */
    fontFamily: string;
    /**
     * Text decoration underline.
     * @type Boolean
     */
    underline: boolean;
    /**
     * Text decoration overline.
     * @type Boolean
     */
    overline: boolean;
    /**
     * Text decoration linethrough.
     * @type Boolean
     */
    linethrough: boolean;
    squigglyline: boolean;
    squigglylineColor: string;
    isStrokeForBold: boolean;
    pmwRunStyles?: Record<string, unknown>;
    /******These are just custom properties later used by our webapp code. They are added here for ts support*************/
    ignoreDelegatedSet: boolean;
    /**
     * Text alignment. Possible values: "left", "center", "right", "justify",
     * "justify-left", "justify-center" or "justify-right".
     * @type TextAlign
     */
    textAlign: TextAlign;
    /**
     * Font style . Possible values: "", "normal", "italic" or "oblique".
     * @type FontStyle
     */
    fontStyle: FontStyle;
    /**
     * Line height
     * @type Number
     */
    lineHeight: number;
    /**
     * Superscript schema object (minimum overlap)
     */
    superscript: {
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
    subscript: {
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
    textBackgroundColor: string;
    styles: TextStyle;
    /**
     * *PMW* Per-line style declarations keyed by REAL (unwrapped) line index. Fabric consumes
     * `textAlign` (overrides the object-level alignment for that line) and `leftIndent` (extra
     * left offset in text units, e.g. for list rows); any other key is an opaque passenger that
     * the editing logic shifts with its line (see ITextBehavior). Never mutate a record in
     * place — writers always assign fresh objects so caches and snapshots stay coherent.
     */
    lineStyles: Record<number | string, LineStyleDeclaration>;
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
    path?: Path;
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
    textDecorationThickness: number;
    /**
     * Optional text decoration color for underline, overline and strikethrough.
     * When undefined, decoration color falls back to the text fill color.
     * This feature is not really supported by anything else than svg 2 specs with css3 support.
     * Chrome does not support this, nor firefox apparently.
     */
    textDecorationColor?: string;
    /**
     * Offset amount for text path starting position
     * Only used when text has a path
     */
    pathStartOffset: number;
    /**
     * Which side of the path the text should be drawn on.
     * Only used when text has a path
     * @type {TPathSide} 'left|right'
     */
    pathSide: TPathSide;
    /**
     * How text is aligned to the path. This property determines
     * the perpendicular position of each character relative to the path.
     * (one of "baseline", "center", "ascender", "descender")
     * This feature is in BETA, and its behavior may change
     * @type TPathAlign
     */
    pathAlign: TPathAlign;
    /**
     * @private
     */
    _fontSizeFraction: number;
    /**
     * @private
     */
    offsets: {
        underline: number;
        linethrough: number;
        squigglyline: number;
        overline: number;
    };
    /**
     * Text Line proportion to font Size (in pixels)
     * @type Number
     */
    _fontSizeMult: number;
    /**
     * additional space between characters
     * expressed in thousands of em unit
     * @type Number
     */
    charSpacing: number;
    /**
     * Baseline shift, styles only, keep at 0 for the main text object
     * @type {Number}
     */
    deltaY: number;
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
    direction: CanvasDirection;
    /**
     * contains characters bounding boxes
     * This variable is considered to be protected.
     * But for how mixins are implemented right now, we can't leave it private
     * @protected
     */
    __charBounds: GraphemeBBox[][];
    /** *PMW* memo of {@link getGlyphOverhang}, reset with the other layout caches */
    private __glyphOverhang;
    /**
     * use this size when measuring text. To avoid IE11 rounding errors
     * @type {Number}
     * @readonly
     * @private
     */
    CACHE_FONT_SIZE: number;
    /**
     * contains the min text width to avoid getting 0
     * @type {Number}
     */
    MIN_TEXT_WIDTH: number;
    /**
     * contains the the text of the object, divided in lines as they are displayed
     * on screen. Wrapping will divide the text independently of line breaks
     * @type {string[]}
     */
    textLines: string[];
    /**
     * same as textlines, but each line is an array of graphemes as split by splitByGrapheme
     * @type {string[]}
     */
    _textLines: string[][];
    _unwrappedTextLines: string[][];
    _text: string[];
    cursorWidth: number;
    __lineHeights: number[];
    __lineWidths: number[];
    /**
     * *PMW* Per-layout memo of each real line's measured list marker width, keyed by real line
     * index. Reset by _clearCache.
     */
    __listMarkerWidths: Record<number, number>;
    /**
     * *PMW* Per-layout memo of the shared list gutters (auto rows, migrated legacy rows). Reset
     * by _clearCache.
     */
    __listGutterWidths: {
        auto?: number;
        legacy?: number;
    };
    initialized?: true;
    static cacheProperties: string[];
    static ownDefaults: Partial<TClassProperties<FabricText<Partial<TextProps>, SerializedTextProps, ObjectEvents>>>;
    static type: string;
    static getDefaults(): Record<string, any>;
    constructor(text: string, options?: Props);
    /**
     * If text has a path, it will add the extra information needed
     * for path and text calculations
     */
    setPathInfo(): void;
    /**
     * @private
     * Divides text into lines of text and lines of graphemes.
     */
    _splitText(): TextLinesInfo;
    /**
     * Initialize or update text dimensions.
     * Updates this.width and this.height with the proper values.
     * Does not return dimensions.
     */
    initDimensions(): void;
    /**
     * Enlarge space boxes and shift the others
     */
    enlargeSpaces(): void;
    /**
     * Detect if the text line is ended with an hard break
     * text and itext do not have wrapping, return false
     * @return {Boolean}
     */
    isEndOfWrapping(lineIndex: number): boolean;
    /**
     * Detect if a line has a linebreak and so we need to account for it when moving
     * and counting style.
     * It return always 1 for text and Itext. Textbox has its own implementation
     * @return Number
     */
    missingNewlineOffset(lineIndex: number, skipWrapping?: boolean): 0 | 1;
    /**
     * Returns 2d representation (lineIndex and charIndex) of cursor
     * @param {Number} selectionStart
     * @param {Boolean} [skipWrapping] consider the location for unwrapped lines. useful to manage styles.
     */
    get2DCursorLocation(selectionStart: number, skipWrapping?: boolean): {
        lineIndex: number;
        charIndex: number;
    };
    /**
     * Returns string representation of an instance
     * @return {String} String representation of text object
     */
    toString(): string;
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
    _getCacheCanvasDimensions(): TCacheCanvasDimensions;
    /**
     * *PMW* The largest reach (blur plus offset) of any per-character shadow declaration,
     * in text units. 0 when no character carries a shadow.
     * @private
     */
    _getMaxCharShadowExtent(): number;
    /**
     * *PMW* How far the painted glyphs reach past the text box, in text units. Measured from
     * the ink bounds the browser reports for every grapheme ({@link GlyphInkBounds}), so an
     * uploaded script face is covered as well as a bundled one. Text on a path reports 0.
     */
    getGlyphOverhang(): TGlyphOverhang;
    /**
     * *PMW* Walks every measured grapheme: horizontally, its ink left of the line start and
     * right of the box edge, both after the line's alignment offset (a right-to-left line lays
     * its graphemes out mirrored, so it counts each glyph's reach past its own advance box
     * instead, with no alignment credit, and reads conservatively);
     * vertically, the first line's ink above its baseline and the last line's ink below the
     * box bottom. A stroke paints half its width outside the outline on every side.
     * @private
     */
    _computeGlyphOverhang(): TGlyphOverhang;
    /**
     * *PMW* Applies a per-character shadow declaration (a plain
     * {color, blur, offsetX, offsetY} object, never a Shadow instance) to the context,
     * mirroring Object._setShadow's scaling math. Callers scope it with save/restore.
     * @private
     */
    _setCharShadow(ctx: CanvasRenderingContext2D, shadow: {
        color?: string;
        blur?: number;
        offsetX?: number;
        offsetY?: number;
    }): void;
    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _render(ctx: CanvasRenderingContext2D): void;
    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _renderText(ctx: CanvasRenderingContext2D): void;
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
    _setTextStyles(ctx: CanvasRenderingContext2D, charStyle?: any, forMeasuring?: boolean): void;
    /**
     * calculate and return the text Width measuring each line.
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     * @return {Number} Maximum width of Text object
     */
    calcTextWidth(): number;
    /**
     * @private
     * @param {String} method Method name ("fillText" or "strokeText")
     * @param {CanvasRenderingContext2D} ctx Context to render on
     * @param {String} line Text to render
     * @param {Number} left Left position of text
     * @param {Number} top Top position of text
     * @param {Number} lineIndex Index of a line in a text
     */
    _renderTextLine(method: 'fillText' | 'strokeText', ctx: CanvasRenderingContext2D, line: string[], left: number, top: number, lineIndex: number): void;
    /**
     * Renders the text background for lines, taking care of style
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _renderTextLinesBackground(ctx: CanvasRenderingContext2D): void;
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
    _measureChar(_char: string, charStyle: CompleteTextStyleDeclaration, previousChar: string | undefined, prevCharStyle: CompleteTextStyleDeclaration | Record<string, never>): {
        width: number;
        kernedWidth: number;
        ink: {
            left: number;
            right: number;
            ascent: number;
            descent: number;
        };
    };
    /**
     * Computes height of character at given position
     * @param {Number} line the line index number
     * @param {Number} _char the character index number
     * @return {Number} fontSize of the character
     */
    getHeightOfChar(line: number, _char: number): number;
    /**
     * measure a text line measuring all characters.
     * @param {Number} lineIndex line number
     */
    measureLine(lineIndex: number): {
        width: number;
        numOfSpaces: number;
    };
    /**
     * measure every grapheme of a line, populating __charBounds
     * @param {Number} lineIndex
     * @return {Object} object.width total width of characters
     * @return {Object} object.numOfSpaces length of chars that match this._reSpacesAndTabs
     */
    _measureLine(lineIndex: number): {
        width: number;
        numOfSpaces: number;
    };
    /**
     * Calculate the angle  and the left,top position of the char that follow a path.
     * It appends it to graphemeInfo to be reused later at rendering
     * @private
     * @param {Number} positionInPath to be measured
     * @param {GraphemeBBox} graphemeInfo current grapheme box information
     * @param {Object} startingPoint position of the point
     */
    _setGraphemeOnPath(positionInPath: number, graphemeInfo: GraphemeBBox): void;
    /**
     *
     * @param {String} grapheme to be measured
     * @param {Number} lineIndex index of the line where the char is
     * @param {Number} charIndex position in the line
     * @param {String} [prevGrapheme] character preceding the one to be measured
     * @returns {GraphemeBBox} grapheme bbox
     */
    _getGraphemeBox(grapheme: string, lineIndex: number, charIndex: number, prevGrapheme?: string, skipLeft?: boolean): GraphemeBBox;
    /**
     * Calculate height of line at 'lineIndex',
     * without the lineHeigth multiplication factor
     * @private
     * @param {Number} lineIndex index of line to calculate
     * @return {Number}
     */
    /** *PMW* also read by the SVG export mixin, which is a separate class */
    getHeightOfLineImpl(lineIndex: number): number;
    /**
     * Calculate height of line at 'lineIndex'
     * @param {Number} lineIndex index of line to calculate
     * @return {Number}
     */
    getHeightOfLine(lineIndex: number): number;
    /**
     * Calculate text box height
     */
    calcTextHeight(): number;
    /**
     * @private
     * @return {Number} Left offset
     */
    _getLeftOffset(): number;
    /**
     * @private
     * @return {Number} Top offset
     */
    _getTopOffset(): number;
    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     * @param {String} method Method name ("fillText" or "strokeText")
     */
    _renderTextCommon(ctx: CanvasRenderingContext2D, method: 'fillText' | 'strokeText'): void;
    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _renderTextFill(ctx: CanvasRenderingContext2D): void;
    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _renderTextStroke(ctx: CanvasRenderingContext2D): void;
    /**
     * @private
     * @param {String} method fillText or strokeText.
     * @param {CanvasRenderingContext2D} ctx Context to render on
     * @param {Array} line Content of the line, split in an array by grapheme
     * @param {Number} left
     * @param {Number} top
     * @param {Number} lineIndex
     */
    _renderChars(method: 'fillText' | 'strokeText', ctx: CanvasRenderingContext2D, line: Array<any>, left: number, top: number, lineIndex: number): void;
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
    _applyPatternGradientTransformText(filler: TFiller): CanvasPattern;
    handleFiller<T extends 'fill' | 'stroke'>(ctx: CanvasRenderingContext2D, property: `${T}Style`, filler: TFiller | string): {
        offsetX: number;
        offsetY: number;
    };
    /**
     * This function prepare the canvas for a stroke style, and stroke and strokeWidth
     * need to be sent in as defined
     * @param {CanvasRenderingContext2D} ctx
     * @param {CompleteTextStyleDeclaration} style with stroke and strokeWidth defined
     * @returns
     */
    _setStrokeStyles(ctx: CanvasRenderingContext2D, { stroke, strokeWidth, }: Pick<CompleteTextStyleDeclaration, 'stroke' | 'strokeWidth'>): {
        offsetX: number;
        offsetY: number;
    };
    /**
     * This function prepare the canvas for a ill style, and fill
     * need to be sent in as defined
     * @param {CanvasRenderingContext2D} ctx
     * @param {CompleteTextStyleDeclaration} style with ill defined
     * @returns
     */
    _setFillStyles(ctx: CanvasRenderingContext2D, { fill }: Pick<this, 'fill'>): {
        offsetX: number;
        offsetY: number;
    };
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
    _renderChar(method: 'fillText' | 'strokeText', ctx: CanvasRenderingContext2D, lineIndex: number, charIndex: number, _char: string, left: number, top: number): void;
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
    _getRealLineIndex(visualLineIndex: number): number;
    /**
     * *PMW* The alignment a visual line renders with: its real line's `lineStyles.textAlign`
     * override when present, the object-level `textAlign` otherwise.
     * @private
     */
    _getEffectiveTextAlignForLine(visualLineIndex: number): string;
    /**
     * *PMW* Whether a visual line is the first visual row of its real (unwrapped) line — where a
     * list marker draws. Plain text has no wrapping, so always true; Textbox overrides.
     * @private
     */
    _isStartOfRealLine(_visualLineIndex: number): boolean;
    /**
     * *PMW* Where a real line's text column DRAWS, in text units (the line offset and, through
     * it, the marker renderer). A migrated legacy list row (explicit `leftIndent` AND a marker)
     * draws at the legacy gutter — the live-measured widest marker plus the gap, exactly what the
     * legacy renderer computed on every load — so its text lands where it always did even though
     * the row RESERVES the migration's estimate of that gutter ({@link _getRealLineReservedWidth}).
     * A plain explicit `leftIndent` draws at that indent; an auto list row at the shared gutter.
     * @private
     */
    _getRealLineIndent(realLineIndex: number): number;
    /**
     * *PMW* How much of the box width a real line RESERVES for its gutter, in text units: the
     * explicit `leftIndent` when set (a migrated row's legacy gutter estimate — this is what keeps
     * its wrap width `width − leftIndent` identical to the legacy text area), else the shared auto
     * gutter of a list row, else 0. Consumed by the Textbox wrap, justify and the alignment free
     * space; the drawn column is {@link _getRealLineIndent}.
     * @private
     */
    _getRealLineReservedWidth(realLineIndex: number): number;
    /**
     * *PMW* The legacy renderer's gutter for the box's migrated list rows (explicit `leftIndent`
     * AND a marker): its single bullets textbox was as wide as the widest marker, and the text sat
     * one gap right of it — no floor. Un-floored on purpose: a migrated "1."–"9." list keeps its
     * narrower-than-floor column.
     * @private
     */
    _getLegacyListGutterWidth(): number;
    _computeLegacyListGutterWidth(): number;
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
    _getAutoListGutterWidth(): number;
    _computeAutoListGutterWidth(): number;
    /**
     * *PMW* The font/fill a real line's list marker renders with: the record's own marker keys,
     * falling back to the line's first character's effective style.
     * @private
     */
    _getListMarkerStyle(realLineIndex: number): {
        fontSize: number;
        fontFamily: string;
        fill: string;
    };
    /**
     * *PMW* Measured width of a real line's list marker in text units. Memoized per layout
     * (see {@link _clearCache}); the gutter walks and the marker render share the measurement.
     * @private
     */
    _measureListMarkerWidth(realLineIndex: number): number;
    _computeListMarkerWidth(realLineIndex: number, marker: string): number;
    /**
     * *PMW* Draws a real line's list marker in the gutter left of its first visual row, on the
     * fill pass. `lineDrawLeft`/`lineDrawTop` are the row's own draw anchors.
     * @private
     */
    _renderListMarker(ctx: CanvasRenderingContext2D, visualLineIndex: number, lineDrawLeft: number, lineDrawTop: number): void;
    /**
     * *PMW* Where a visual row's list marker is drawn, in text units, given the row's own draw
     * anchors (`lineDrawLeft` is the row's text start, `lineDrawTop` its bottom). Shared by the
     * canvas render and the SVG export so both put the marker in the same place. Null when the
     * row does not start a listed real line.
     *
     * LTR: right-aligned in the LEFT gutter (like the legacy bullets textbox) — the marker's
     * right edge sits a fixed gap from the text column, so ordinal periods line up and digits
     * grow left. RTL mirrors: the gutter (and the marker) sit RIGHT of the text, whose draw
     * anchor is its right edge there. An unordered glyph is raised a little above the baseline.
     * @private
     */
    _getListMarkerPlacement(visualLineIndex: number, lineDrawLeft: number, lineDrawTop: number): TListMarkerPlacement | null;
    /**
     * *PMW* Sets or clears (align undefined) one real line's alignment override.
     */
    setLineAlignment(realLineIndex: number, align?: string): void;
    /**
     * *PMW* The alignment the given real line renders with.
     */
    getLineAlignment(realLineIndex: number): string;
    /**
     * *PMW* Applies (or clears, when align is undefined) an alignment override to every real
     * line the grapheme range [start, end) touches.
     */
    setSelectionAlignment(start: number, end: number, align?: string): void;
    setSuperscript(start: number, end: number): void;
    /**
     * Turns the character into an 'inferior figure' (i.e. 'subscript')
     * @param {Number} start selection start
     * @param {Number} end selection end
     */
    setSubscript(start: number, end: number): void;
    /**
     * Applies 'schema' at given position
     * @private
     * @param {Number} start selection start
     * @param {Number} end selection end
     * @param {Number} schema
     */
    protected _setScript(start: number, end: number, schema: {
        size: number;
        baseline: number;
    }): void;
    /**
     * @private
     * @param {Number} lineIndex index text line
     * @return {Number} Line left offset
     */
    _getLineLeftOffset(lineIndex: number): number;
    /**
     * @private
     */
    _clearCache(): void;
    /**
     * Measure a single line given its index. Used to calculate the initial
     * text bounding box. The values are calculated and stored in __lineWidths cache.
     * @private
     * @param {Number} lineIndex line number
     * @return {Number} Line width
     */
    getLineWidth(lineIndex: number): number;
    _getWidthOfCharSpacing(): number;
    /**
     * Retrieves the value of property at given character position
     * @param {Number} lineIndex the line number
     * @param {Number} charIndex the character number
     * @param {String} property the property name
     * @returns the value of 'property'
     */
    getValueOfPropertyAt<T extends StylePropertiesType>(lineIndex: number, charIndex: number, property: T): this[T];
    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _renderTextDecoration(ctx: CanvasRenderingContext2D, type: 'underline' | 'linethrough' | 'overline' | 'squigglyline'): void;
    /**
     *  *PMW*
     * Handle squigglyline. `fontSize` is the decorated run's font size: the squiggle's wave
     * and dots scale with it (see {@link fillSquigglyLine}), the other decorations ignore it.
     * @private
     */
    private fillTextDecorationRect;
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
    private fillSquigglyLine;
    /**
     * *PMW* How many text units one device pixel spans under the context's current transform
     * (object scale × viewport zoom × device pixel ratio, cache canvases included). 1 when the
     * context cannot report its transform.
     * @private
     */
    private _getTextUnitsPerDevicePixel;
    /**
     *  *PMW*
     * Handle squigglyline, gradient fill and pattern fill for text decoration
     * @private
     */
    private getFillForTextDecoration;
    /**
     * *PMW*
     * Draws a background for the object big as its untrasformed dimensions
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _renderBackground(ctx: CanvasRenderingContext2D): void;
    getCharOffset(position: number): {
        x: number;
        y: number;
    };
    /**
     * *PMW*
     * Find new selection index representing start of current word according to current selection index
     * @param {Number} startFrom Current selection index
     * @return {Number} selection start index
     */
    findSelectedWordLeft(startFrom: number): number;
    /**
     * *PMW*
     * Find new selection index representing end of current word according to current selection index
     * @param {Number} startFrom Current selection index
     * @return {Number} selection end index
     */
    findSelectedWordRight(startFrom: number): number;
    /**
     * return font declaration string for canvas context
     * @param {Object} [styleObject] object
     * @returns {String} font declaration formatted for canvas context.
     */
    _getFontDeclaration({ fontFamily, fontStyle, fontWeight, fontSize, }?: Partial<Pick<TextStyleDeclaration, 'fontFamily' | 'fontStyle' | 'fontWeight' | 'fontSize'>>, forMeasuring?: boolean): string;
    /**
     * Renders text instance on a specified context
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    render(ctx: CanvasRenderingContext2D): void;
    /**
     * Override this method to customize grapheme splitting
     * @todo the util `graphemeSplit` needs to be injectable in some way.
     * is more comfortable to inject the correct util rather than having to override text
     * in the middle of the prototype chain
     * @param {string} value
     * @returns {string[]} array of graphemes
     */
    graphemeSplit(value: string): string[];
    /**
     * Returns the text as an array of lines.
     * @param {String} text text to split
     * @returns  Lines in the text
     */
    _splitTextIntoLines(text: string): TextLinesInfo;
    /**
     * Returns object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} Object representation of an instance
     */
    toObject<T extends Omit<Props & TClassProperties<this>, keyof SProps>, K extends keyof T = never>(propertiesToInclude?: K[]): Pick<T, K> & SProps;
    set(key: string | any, value?: any): this;
    /**
     * Returns complexity of an instance
     * @return {Number} complexity
     */
    complexity(): number;
    /**
     * List of generic font families
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font-family#generic-name
     */
    static genericFonts: string[];
    /**
     * List of attribute names to account for when parsing SVG element (used by {@link FabricText.fromElement})
     * @see: http://www.w3.org/TR/SVG/text.html#TextElement
     */
    static ATTRIBUTE_NAMES: string[];
    /**
     * Returns FabricText instance from an SVG element (<b>not yet implemented</b>)
     * @param {HTMLElement} element Element to parse
     * @param {Object} [options] Options object
     */
    static fromElement(element: HTMLElement | SVGElement, options?: Abortable, cssRules?: CSSRules): Promise<FabricText<{
        signal?: AbortSignal;
        left: number;
        top: number;
        underline: boolean;
        overline: boolean;
        linethrough: boolean;
        squigglyline: boolean;
        strokeWidth: number;
        fontSize: number;
    }, SerializedTextProps, ObjectEvents>>;
    /**
     * Returns FabricText instance from an object representation
     * @param {Object} object plain js Object to create an instance from
     * @returns {Promise<FabricText>}
     */
    static fromObject<T extends TOptions<SerializedTextProps>, S extends FabricText>(object: T): Promise<S>;
}
export {};
//# sourceMappingURL=Text.d.ts.map