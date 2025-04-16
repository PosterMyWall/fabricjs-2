import { type FabricObject, type TOriginX, type TOriginY } from '@postermywall/fabricjs-2';
/**
 * Updates the fromObject function of a class to return a version that can restore old data
 * with values of originX and originY that are different from 'center', 'center'
 * Used to upgrade from fabric 6 to fabric 7
 * @param originalFn the original fromObject function of an object,
 * @param defaultOriginX optional default value for non exported originX,
 * @param defaultOriginY optional default value for non exported originY,
 * @returns a wrapped fromObject function for the object
 */
export declare const originUpdaterWrapper: <T extends FabricObject = FabricObject>(originalFn: (...args: any[]) => Promise<T>, defaultOriginX?: TOriginX, defaultOriginY?: TOriginY) => ((...args: any[]) => Promise<T>);
/**
 * Wraps and override the current fabricJS fromObject static functions
 * Used to upgrade from fabric 7 to fabric 8
 * If you used to export with includeDefaultValues = false, you have to specify
 * which were yours default origins values
 * @param originX optional default value for non exported originX,
 * @param originY optional default value for non exported originY,
 */
export declare const installOriginWrapperUpdater: (originX?: TOriginX, originY?: TOriginY) => void;
//# sourceMappingURL=index.d.ts.map