import { FabricObjectSVGExportMixin } from './FabricObjectSVGExportMixin.mjs';
import { InteractiveFabricObject } from './InteractiveObject.mjs';
import { applyMixins } from '../../util/applyMixins.mjs';
import { classRegistry } from '../../ClassRegistry.mjs';

// TODO somehow we have to make a tree-shakeable import

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
class FabricObject extends InteractiveFabricObject {}
applyMixins(FabricObject, [FabricObjectSVGExportMixin]);
classRegistry.setClass(FabricObject);
classRegistry.setClass(FabricObject, 'object');

export { FabricObject };
//# sourceMappingURL=FabricObject.mjs.map
