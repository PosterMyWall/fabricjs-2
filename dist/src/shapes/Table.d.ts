import { Group, type GroupProps } from './Group';
import type { FabricObject, IText } from 'fabric';
export interface TableProps extends GroupProps {
    rows: number;
    columns: number;
    layoutType: string;
    alternateBackgroundColor1: string;
    alternateBackgroundColor2: string;
    highlightedRowsBackgroundColor: string;
    highlightedRows: Array<number>;
    tableArray: Array<Array<IText>>;
    ySpacing: number;
    xSpacing: number;
    fontSize: number;
    hasButton: boolean;
}
export declare class Table extends Group {
    /**
     * Type of an object
     * @type String
     * @default
     */
    static type: string;
    /**
     * Number of table rows
     */
    rows: number;
    /**
     * Number of table columns
     */
    columns: number;
    /**
     * Layout style
     */
    layoutType: string;
    /**
     * Background color 1 for alternate table background
     */
    alternateBackgroundColor1: null;
    /**
     * Background color 2 for alternate table background
     */
    alternateBackgroundColor2: null;
    /**
     * Background color for highlighted rows
     */
    highlightedRowsBackgroundColor: null;
    /**
     * Array containing indices of highlighted rows
     */
    highlightedRows: Array<number>;
    /**
     * 2D array containing table data
     */
    tableArray: Array<Array<IText>>;
    /**
     * Spacing Between rows of table
     */
    ySpacing: number;
    /**
     * Spacing Between column of table
     */
    xSpacing: number;
    fontSize: number;
    /**
     * Property used for showing the 'edit content' button
     */
    hasButton: boolean;
    constructor(objects?: FabricObject[], options?: Partial<TableProps>);
    render(ctx: CanvasRenderingContext2D): void;
    /**
     * Draws the table/schedule border
     * @param {CanvasRenderingContext2D} ctx context to draw on
     */
    renderTableBorders(ctx: CanvasRenderingContext2D): void;
    isTable(): this is Table;
    /**
     * This function is responsible for rendering the background of table.
     * It loops over all the rows in the table and draws the appropriate color rectangle for each row.
     * If more then one consecutive rows have background of same color then it draws a one big rectangle of that color.
     * @param {CanvasRenderingContext2D} ctx context to render on
     */
    _renderBackground(ctx: CanvasRenderingContext2D): void;
    /**
     * Returns an array containing string values corresponding to rows background color.
     * 'highlight' for selected rows
     * 'color' for when colored background is selected by user
     * 'alternate1' for even rows when alternate background is selected
     * 'alternate2' for odd rows when alternate background is selected
     * 'none' for transparent background
     * @returns {Array}
     */
    getTableBackGroundData(): string[];
    /**
     * Returns the height of an item in a given row with max height,
     * this value is basically the minimum space in y-axis needed by this row in a table.
     * @param {Number} row
     * @returns {Number}
     */
    getHeightOfRow(row: number): number;
    /**
     * Returns the width of an item in a given column with max width,
     * this value is basically the minimum space in x-axis needed by this column in a table.
     * @param {Number} column column index
     * @returns {Number} minimum width required by this column
     */
    getWidthOfColumn(column: number): number;
    /**
     * renders border for table columns
     * @param {CanvasRenderingContext2D} ctx context to render on
     */
    drawColumnBorders(ctx: CanvasRenderingContext2D): void;
    /**
     * renders border for table rows
     * @param {CanvasRenderingContext2D} ctx context to render on
     */
    drawRowBorders(ctx: CanvasRenderingContext2D): void;
    /**
     * Returns true if design is simple table structure('custom-table' or 'layout-1'), false otherwise
     * @returns {boolean}
     */
    isTableLayout(): boolean;
}
//# sourceMappingURL=Table.d.ts.map