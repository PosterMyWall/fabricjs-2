import type { FabricObject } from '../../shapes/Object/FabricObject';
import type { LayoutStrategyResult, StrictLayoutContext } from '../types';
import { LayoutStrategy } from './LayoutStrategy';
/**
 * Layout will keep target's initial size.
 */
export declare class MaxObjectLayout extends LayoutStrategy {
    static readonly type = "max-object";
    /**
     * @override layout on all triggers
     * Override at will
     */
    shouldPerformLayout(context: StrictLayoutContext): boolean;
    /**
     * Override this method to customize layout.
     */
    calcBoundingBox(objects: FabricObject[], context: StrictLayoutContext): LayoutStrategyResult | undefined;
}
//# sourceMappingURL=MaxObjectLayout.d.ts.map