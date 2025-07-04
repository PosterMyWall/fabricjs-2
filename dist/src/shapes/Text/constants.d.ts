import type { TClassProperties } from '../../typedefs';
import type { FabricText } from './Text';
export declare const TEXT_DECORATION_THICKNESS = "textDecorationThickness";
export declare const textDecorationProperties: readonly ["underline", "overline", "linethrough", "squigglyline"];
export declare const textLayoutProperties: string[];
export declare const additionalProps: readonly [...string[], "underline", "overline", "linethrough", "squigglyline", "textBackgroundColor", "direction", "textDecorationThickness"];
export type StylePropertiesType = 'fill' | 'stroke' | 'strokeWidth' | 'fontSize' | 'fontFamily' | 'fontWeight' | 'fontStyle' | 'textBackgroundColor' | 'deltaY' | 'squigglyline' | 'isStrokeForBold' | 'overline' | 'underline' | 'linethrough' | typeof TEXT_DECORATION_THICKNESS;
export declare const styleProperties: Readonly<StylePropertiesType[]>;
export declare const textDefaultValues: Partial<TClassProperties<FabricText>>;
export declare const JUSTIFY = "justify";
export declare const JUSTIFY_LEFT = "justify-left";
export declare const JUSTIFY_RIGHT = "justify-right";
export declare const JUSTIFY_CENTER = "justify-center";
//# sourceMappingURL=constants.d.ts.map