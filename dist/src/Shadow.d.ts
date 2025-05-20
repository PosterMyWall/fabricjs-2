import type { FabricObject } from './shapes/Object/FabricObject';
import type { TClassProperties } from './typedefs';
/**
   * Regex matching shadow offsetX, offsetY and blur (ex: "2px 2px 10px rgba(0,0,0,0.2)", "rgb(0,255,0) 2px 2px")
   * - (?:\s|^): This part captures either a whitespace character (\s) or the beginning of a line (^). It's non-capturing (due to (?:...)), meaning it doesn't create a capturing group.
   * - (-?\d+(?:\.\d*)?(?:px)?(?:\s?|$))?: This captures the first component of the shadow, which is the horizontal offset. Breaking it down:
   *   - (-?\d+): Captures an optional minus sign followed by one or more digits (integer part of the number).
   *   - (?:\.\d*)?: Optionally captures a decimal point followed by zero or more digits (decimal part of the number).
   *   - (?:px)?: Optionally captures the "px" unit.
   *   - (?:\s?|$): Captures either an optional whitespace or the end of the line. This whole part is wrapped in a non-capturing group and marked as optional with ?.
   * - (-?\d+(?:\.\d*)?(?:px)?(?:\s?|$))?: Similar to the previous step, this captures the vertical offset.

(\d+(?:\.\d*)?(?:px)?)?: This captures the blur radius. It's similar to the horizontal offset but without the optional minus sign.

(?:\s+(-?\d+(?:\.\d*)?(?:px)?(?:\s?|$))?){0,1}: This captures an optional part for the color. It allows for whitespace followed by a component with an optional minus sign, digits, decimal point, and "px" unit.

(?:$|\s): This captures either the end of the line or a whitespace character. It ensures that the match ends either at the end of the string or with a whitespace character.
   */
export declare enum ShadowOrGlowType {
    LIGHT_SHADOW = "light_shadow",
    STRONG_SHADOW = "strong_shadow",
    CUSTOM_SHADOW = "custom_shadow",
    LIGHT_GLOW = "light_glow",
    STRONG_GLOW = "strong_glow"
}
export declare const shadowDefaultValues: Partial<TClassProperties<Shadow>>;
export type SerializedShadowOptions = {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
    affectStroke: boolean;
    nonScaling: boolean;
    type: string;
    shadowOrGlowType: ShadowOrGlowType;
};
export declare class Shadow {
    /**
     * Shadow color
     * @type String
     * @default
     */
    color: string;
    /**
     * Shadow blur
     * @type Number
     */
    blur: number;
    /**
     * Shadow horizontal offset
     * @type Number
     * @default
     */
    offsetX: number;
    /**
     * Shadow vertical offset
     * @type Number
     * @default
     */
    offsetY: number;
    /**
     * Whether the shadow should affect stroke operations
     * @type Boolean
     * @default
     */
    affectStroke: boolean;
    /**
     * Indicates whether toObject should include default values
     * @type Boolean
     * @default
     */
    includeDefaultValues: boolean;
    /**
     * When `false`, the shadow will scale with the object.
     * When `true`, the shadow's offsetX, offsetY, and blur will not be affected by the object's scale.
     * default to false
     * @type Boolean
     * @default
     */
    nonScaling: boolean;
    id: number;
    shadowOrGlowType: ShadowOrGlowType;
    static ownDefaults: Partial<TClassProperties<Shadow>>;
    static type: string;
    /**
     * @see {@link http://fabricjs.com/shadows|Shadow demo}
     * @param {Object|String} [options] Options object with any of color, blur, offsetX, offsetY properties or string (e.g. "rgba(0,0,0,0.2) 2px 2px 10px")
     */
    constructor(options?: Partial<TClassProperties<Shadow>>);
    constructor(svgAttribute: string);
    /**
     * @param {String} value Shadow value to parse
     * @return {Object} Shadow object with color, offsetX, offsetY and blur
     */
    static parseShadow(value: string): {
        color: string;
        offsetX: number;
        offsetY: number;
        blur: number;
    };
    isShadow(): boolean;
    isCustomShadow(): boolean;
    isGlow(): boolean;
    isLightShadow(): boolean;
    isStrongShadow(): boolean;
    /**
     * Returns a string representation of an instance
     * @see http://www.w3.org/TR/css-text-decor-3/#text-shadow
     * @return {String} Returns CSS3 text-shadow declaration
     */
    toString(): string;
    /**
     * Returns SVG representation of a shadow
     * @param {FabricObject} object
     * @return {String} SVG representation of a shadow
     */
    toSVG(object: FabricObject): string;
    /**
     * Returns object representation of a shadow
     * @return {Object} Object representation of a shadow instance
     */
    toObject(): Partial<SerializedShadowOptions>;
    static fromObject(options: Partial<TClassProperties<Shadow>>): Promise<Shadow>;
}
//# sourceMappingURL=Shadow.d.ts.map