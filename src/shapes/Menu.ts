//*PMW* class addded for menu
import { Table } from './Table';
import { classRegistry } from '../ClassRegistry';
import { FabricObject } from './Object/Object';

export class CustomBorderTable extends Table {
  /**
   * Renders vertical borders for table Style Menu Layouts
   * @param {CanvasRenderingContext2D} ctx context to render on
   */
  drawColumnBorders(ctx: CanvasRenderingContext2D) {
    const groups = this.getObjects();
    let  w,
      maxWidth = 0,
      left = 0;

    for (let i = 0; i < groups.length; i++) {
      // @ts-ignore
      const items = groups[i].getObjects();
      w = items[1].width;
      if (w > maxWidth) {
        maxWidth = w;
        left = this.width / 2 - maxWidth;
      }
    }
    ctx.beginPath();
    ctx.moveTo(left - this.padding * 2, -(this.height / 2));
    ctx.lineTo(left - this.padding * 2, -(this.height / 2) + this.height);
    ctx.stroke();
  }

  /**
   * Returns true if design is simple table structure('layout-13'), false otherwise
   * @returns {boolean}
   */
  isTableLayout() {
    return this.layoutType == 'layout-13';
  }
}
