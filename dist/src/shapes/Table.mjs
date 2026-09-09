import { _defineProperty } from "../../_virtual/_@oxc-project_runtime@0.126.0/helpers/defineProperty.mjs";
import { classRegistry } from "../ClassRegistry.mjs";
import { Group } from "./Group.mjs";
//#region src/shapes/Table.ts
var Table = class extends Group {
	constructor(objects = [], options = {}) {
		super(objects, options);
		_defineProperty(
			this,
			/**
			* Number of table rows
			*/
			"rows",
			0
		);
		_defineProperty(
			this,
			/**
			* Number of table columns
			*/
			"columns",
			0
		);
		_defineProperty(
			this,
			/**
			* Layout style
			*/
			"layoutType",
			""
		);
		_defineProperty(
			this,
			/**
			* Background color 1 for alternate table background
			*/
			"alternateBackgroundColor1",
			null
		);
		_defineProperty(
			this,
			/**
			* Background color 2 for alternate table background
			*/
			"alternateBackgroundColor2",
			null
		);
		_defineProperty(
			this,
			/**
			* Background color for highlighted rows
			*/
			"highlightedRowsBackgroundColor",
			null
		);
		_defineProperty(
			this,
			/**
			* Array containing indices of highlighted rows
			*/
			"highlightedRows",
			[]
		);
		_defineProperty(
			this,
			/**
			* 2D array containing table data
			*/
			"tableArray",
			[[]]
		);
		_defineProperty(
			this,
			/**
			* Spacing Between rows of table
			*/
			"ySpacing",
			0
		);
		_defineProperty(
			this,
			/**
			* Spacing Between column of table
			*/
			"xSpacing",
			0
		);
		_defineProperty(this, "fontSize", 0);
		_defineProperty(
			this,
			/**
			* Property used for showing the 'edit content' button
			*/
			"hasButton",
			true
		);
	}
	render(ctx) {
		this._transformDone = true;
		super.render(ctx);
		ctx.save();
		this.transform(ctx);
		this.renderTableBorders(ctx);
		ctx.restore();
		this._transformDone = false;
	}
	/**
	* Draws the table/schedule border
	* @param {CanvasRenderingContext2D} ctx context to draw on
	*/
	renderTableBorders(ctx) {
		if (!this.stroke || this.strokeWidth === 0) return;
		ctx.save();
		this._setStrokeStyles(ctx, this);
		ctx.strokeRect(-(this.width / 2), -(this.height / 2), this.width, this.height);
		if (this.isTableLayout()) {
			this.drawColumnBorders(ctx);
			this.drawRowBorders(ctx);
		}
		ctx.restore();
	}
	isTable() {
		return true;
	}
	/**
	* This function is responsible for rendering the background of table.
	* It loops over all the rows in the table and draws the appropriate color rectangle for each row.
	* If more then one consecutive rows have background of same color then it draws a one big rectangle of that color.
	* @param {CanvasRenderingContext2D} ctx context to render on
	*/
	_renderBackground(ctx) {
		if (this.highlightedRows.length == 0 && !(this.alternateBackgroundColor1 && this.alternateBackgroundColor2) || !this.isTableLayout()) {
			super._renderBackground(ctx);
			return;
		}
		const backgroundData = this.getTableBackGroundData();
		ctx.save();
		const objects = this.getObjects();
		let top = null;
		let height = null;
		let renderBackground = false;
		for (let i = 0; i < backgroundData.length; i++) {
			renderBackground = false;
			if (backgroundData[i] != "none") {
				if (top == null) if (i == 0) top = -this.height / 2;
				else top = objects[i].top - this.ySpacing / 2;
				if (backgroundData[i] != backgroundData[i + 1]) {
					height = Math.abs(top - objects[i].top) + this.getHeightOfRow(i) + this.ySpacing / 2;
					renderBackground = true;
					switch (backgroundData[i]) {
						case "highlight":
							ctx.fillStyle = this.highlightedRowsBackgroundColor;
							break;
						case "color":
							ctx.fillStyle = this.backgroundColor;
							break;
						case "alternate1":
							ctx.fillStyle = this.alternateBackgroundColor1;
							break;
						case "alternate2":
							ctx.fillStyle = this.alternateBackgroundColor2;
							break;
					}
				} else renderBackground = false;
				if (renderBackground) {
					var _height;
					ctx.fillRect(-this.width / 2, top, this.width, (_height = height) !== null && _height !== void 0 ? _height : 0);
					top = null;
					height = null;
				}
			}
		}
		ctx.restore();
	}
	/**
	* Returns an array containing string values corresponding to rows background color.
	* 'highlight' for selected rows
	* 'color' for when colored background is selected by user
	* 'alternate1' for even rows when alternate background is selected
	* 'alternate2' for odd rows when alternate background is selected
	* 'none' for transparent background
	* @returns {Array}
	*/
	getTableBackGroundData() {
		const data = [];
		for (let i = 0; i < this.rows; i++) if (this.highlightedRows.indexOf(i) != -1) data.push("highlight");
		else if (this.backgroundColor != null) data.push("color");
		else if (this.alternateBackgroundColor1 && this.alternateBackgroundColor2) if (i % 2 == 0) data.push("alternate1");
		else data.push("alternate2");
		else data.push("none");
		return data;
	}
	/**
	* Returns the height of an item in a given row with max height,
	* this value is basically the minimum space in y-axis needed by this row in a table.
	* @param {Number} row
	* @returns {Number}
	*/
	getHeightOfRow(row) {
		let height = 0, h;
		for (let i = 0; i < this.columns; i++) {
			h = this.tableArray[i][row].calcTextHeight();
			if (h > height) height = h;
		}
		return height;
	}
	/**
	* Returns the width of an item in a given column with max width,
	* this value is basically the minimum space in x-axis needed by this column in a table.
	* @param {Number} column column index
	* @returns {Number} minimum width required by this column
	*/
	getWidthOfColumn(column) {
		let width = 0, w;
		for (let i = 0; i < this.rows; i++) {
			w = this.tableArray[column][i].calcTextWidth();
			if (w > width) width = w;
		}
		return width;
	}
	/**
	* renders border for table columns
	* @param {CanvasRenderingContext2D} ctx context to render on
	*/
	drawColumnBorders(ctx) {
		const objects = this.getObjects();
		let x = this.rows, maxWidth, w, itemIndex;
		for (let i = 2; i <= this.columns; i++) {
			maxWidth = 0;
			while (objects[x] && objects[x].column == i) {
				w = objects[x].width;
				if (w > maxWidth) {
					maxWidth = w;
					itemIndex = x;
				}
				x++;
			}
			if (itemIndex) {
				ctx.beginPath();
				ctx.moveTo(objects[itemIndex].left - this.xSpacing / 2, -(this.height / 2));
				ctx.lineTo(objects[itemIndex].left - this.xSpacing / 2, -(this.height / 2) + this.height);
				ctx.stroke();
			}
		}
	}
	/**
	* renders border for table rows
	* @param {CanvasRenderingContext2D} ctx context to render on
	*/
	drawRowBorders(ctx) {
		const objects = this.getObjects();
		for (let i = 1; i < this.rows; i++) {
			const startX = -this.width / 2, startY = objects[i].top - this.ySpacing / 2, endX = startX + this.width, endY = startY;
			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.stroke();
		}
	}
	/**
	* Returns true if design is simple table structure('custom-table' or 'layout-1'), false otherwise
	* @returns {boolean}
	*/
	isTableLayout() {
		return this.layoutType == "layout-1" || this.layoutType == "custom-table";
	}
};
_defineProperty(Table, "type", "table");
classRegistry.setClass(Table);
classRegistry.setClass(Table, "table");
//#endregion
export { Table };

//# sourceMappingURL=Table.mjs.map