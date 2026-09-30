import { Table } from "./Table.mjs";
//#region src/shapes/Menu.ts
var CustomBorderTable = class extends Table {
	/**
	* Renders vertical borders for table Style Menu Layouts
	* @param {CanvasRenderingContext2D} ctx context to render on
	*/
	drawColumnBorders(ctx) {
		const groups = this.getObjects();
		let w, maxWidth = 0, left = 0;
		for (let i = 0; i < groups.length; i++) {
			w = groups[i].getObjects()[1].width;
			if (w > maxWidth) {
				maxWidth = w;
				left = this.width / 2 - maxWidth;
			}
		}
		const oldPadding = 11;
		ctx.beginPath();
		ctx.moveTo(left - oldPadding * 2, -(this.height / 2));
		ctx.lineTo(left - oldPadding * 2, -(this.height / 2) + this.height);
		ctx.stroke();
	}
	/**
	* Returns true if design is simple table structure('layout-13'), false otherwise
	* @returns {boolean}
	*/
	isTableLayout() {
		return this.layoutType == "layout-13";
	}
};
//#endregion
export { CustomBorderTable };

//# sourceMappingURL=Menu.mjs.map