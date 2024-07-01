import { ColorMatrix } from './ColorMatrix';
import type { TMatColorMatrix } from './typedefs';
type FixedFiltersOwnProps = {
    colorsOnly: boolean;
};
export declare function createColorMatrixFilter(key: string, matrix: TMatColorMatrix): {
    new ({ type, ...options }?: {
        type?: undefined;
    } & Partial<FixedFiltersOwnProps> & Record<string, any>): ColorMatrix<string, FixedFiltersOwnProps>;
    type: string;
    defaults: {
        matrix: TMatColorMatrix;
        colorsOnly: boolean;
    };
    uniformLocations: string[];
    fromObject({ type, ...filterOptions }: Record<string, any>, options: import("../typedefs").Abortable): Promise<import("./BaseFilter").BaseFilter<string, object>>;
};
export declare const Brownie: {
    new ({ type, ...options }?: {
        type?: undefined;
    } & Partial<FixedFiltersOwnProps> & Record<string, any>): ColorMatrix<string, FixedFiltersOwnProps>;
    type: string;
    defaults: {
        matrix: TMatColorMatrix;
        colorsOnly: boolean;
    };
    uniformLocations: string[];
    fromObject({ type, ...filterOptions }: Record<string, any>, options: import("../typedefs").Abortable): Promise<import("./BaseFilter").BaseFilter<string, object>>;
};
export declare const Vintage: {
    new ({ type, ...options }?: {
        type?: undefined;
    } & Partial<FixedFiltersOwnProps> & Record<string, any>): ColorMatrix<string, FixedFiltersOwnProps>;
    type: string;
    defaults: {
        matrix: TMatColorMatrix;
        colorsOnly: boolean;
    };
    uniformLocations: string[];
    fromObject({ type, ...filterOptions }: Record<string, any>, options: import("../typedefs").Abortable): Promise<import("./BaseFilter").BaseFilter<string, object>>;
};
export declare const Kodachrome: {
    new ({ type, ...options }?: {
        type?: undefined;
    } & Partial<FixedFiltersOwnProps> & Record<string, any>): ColorMatrix<string, FixedFiltersOwnProps>;
    type: string;
    defaults: {
        matrix: TMatColorMatrix;
        colorsOnly: boolean;
    };
    uniformLocations: string[];
    fromObject({ type, ...filterOptions }: Record<string, any>, options: import("../typedefs").Abortable): Promise<import("./BaseFilter").BaseFilter<string, object>>;
};
export declare const Technicolor: {
    new ({ type, ...options }?: {
        type?: undefined;
    } & Partial<FixedFiltersOwnProps> & Record<string, any>): ColorMatrix<string, FixedFiltersOwnProps>;
    type: string;
    defaults: {
        matrix: TMatColorMatrix;
        colorsOnly: boolean;
    };
    uniformLocations: string[];
    fromObject({ type, ...filterOptions }: Record<string, any>, options: import("../typedefs").Abortable): Promise<import("./BaseFilter").BaseFilter<string, object>>;
};
export declare const Polaroid: {
    new ({ type, ...options }?: {
        type?: undefined;
    } & Partial<FixedFiltersOwnProps> & Record<string, any>): ColorMatrix<string, FixedFiltersOwnProps>;
    type: string;
    defaults: {
        matrix: TMatColorMatrix;
        colorsOnly: boolean;
    };
    uniformLocations: string[];
    fromObject({ type, ...filterOptions }: Record<string, any>, options: import("../typedefs").Abortable): Promise<import("./BaseFilter").BaseFilter<string, object>>;
};
export declare const Sepia: {
    new ({ type, ...options }?: {
        type?: undefined;
    } & Partial<FixedFiltersOwnProps> & Record<string, any>): ColorMatrix<string, FixedFiltersOwnProps>;
    type: string;
    defaults: {
        matrix: TMatColorMatrix;
        colorsOnly: boolean;
    };
    uniformLocations: string[];
    fromObject({ type, ...filterOptions }: Record<string, any>, options: import("../typedefs").Abortable): Promise<import("./BaseFilter").BaseFilter<string, object>>;
};
export declare const BlackWhite: {
    new ({ type, ...options }?: {
        type?: undefined;
    } & Partial<FixedFiltersOwnProps> & Record<string, any>): ColorMatrix<string, FixedFiltersOwnProps>;
    type: string;
    defaults: {
        matrix: TMatColorMatrix;
        colorsOnly: boolean;
    };
    uniformLocations: string[];
    fromObject({ type, ...filterOptions }: Record<string, any>, options: import("../typedefs").Abortable): Promise<import("./BaseFilter").BaseFilter<string, object>>;
};
export {};
//# sourceMappingURL=ColorMatrixFilters.d.ts.map