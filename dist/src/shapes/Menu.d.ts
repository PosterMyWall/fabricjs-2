import { Table } from './Table';
export declare class CustomBorderTable extends Table {
    /**
     * Renders vertical borders for table Style Menu Layouts
     * @param {CanvasRenderingContext2D} ctx context to render on
     */
    drawColumnBorders(ctx: CanvasRenderingContext2D): void;
    /**
     * Returns true if design is simple table structure('layout-13'), false otherwise
     * @returns {boolean}
     */
    isTableLayout(): boolean;
}
//# sourceMappingURL=Menu.d.ts.map