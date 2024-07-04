//*PMW* class addded for tables
import { Group } from './Group';
import { classRegistry } from '../ClassRegistry';
import { FabricObject } from './Object/Object';

export class Tabs extends Group {
  /**
   * Type of an object
   * @type String
   * @default
   */
  static type = 'tabs';

  static async fromObject(object: any): Promise<any> {
    return FabricObject._fromObject({
      type: 'tabs',
      ...object
    });
  }
}

classRegistry.setClass(Tabs);
classRegistry.setClass(Tabs, 'tabs');
