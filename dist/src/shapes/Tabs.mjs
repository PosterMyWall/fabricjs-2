import { defineProperty as _defineProperty, objectSpread2 as _objectSpread2 } from '../../_virtual/_rollupPluginBabelHelpers.mjs';
import { Group } from './Group.mjs';
import { classRegistry } from '../ClassRegistry.mjs';
import { FabricObject } from './Object/Object.mjs';

class Tabs extends Group {
  static async fromObject(object) {
    return FabricObject._fromObject(_objectSpread2({
      type: 'tabs'
    }, object));
  }
}
/**
 * Type of an object
 * @type String
 * @default
 */
_defineProperty(Tabs, "type", 'tabs');
classRegistry.setClass(Tabs);
classRegistry.setClass(Tabs, 'tabs');

export { Tabs };
//# sourceMappingURL=Tabs.mjs.map
