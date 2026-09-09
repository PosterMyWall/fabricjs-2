import { _defineProperty } from "../../_virtual/_@oxc-project_runtime@0.126.0/helpers/defineProperty.mjs";
import { classRegistry } from "../ClassRegistry.mjs";
import { FabricObject } from "./Object/Object.mjs";
import { Group } from "./Group.mjs";
//#region src/shapes/Tabs.ts
var Tabs = class extends Group {
	static async fromObject(object) {
		return FabricObject._fromObject({
			type: "tabs",
			...object
		});
	}
};
_defineProperty(Tabs, "type", "tabs");
classRegistry.setClass(Tabs);
classRegistry.setClass(Tabs, "tabs");
//#endregion
export { Tabs };

//# sourceMappingURL=Tabs.mjs.map