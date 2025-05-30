import { defineProperty as _defineProperty } from '../../_virtual/_rollupPluginBabelHelpers.mjs';
import { createCollectionMixin } from '../Collection.mjs';
import { multiplyTransformMatrices, invertTransform } from '../util/misc/matrix.mjs';
import { enlivenObjects, enlivenObjectEnlivables } from '../util/misc/objectEnlive.mjs';
import { applyTransformToObject } from '../util/misc/objectTransforms.mjs';
import { FabricObject } from './Object/FabricObject.mjs';
import { Rect } from './Rect.mjs';
import { classRegistry } from '../ClassRegistry.mjs';
import { log } from '../util/internals/console.mjs';
import { LayoutManager } from '../LayoutManager/LayoutManager.mjs';
import { LAYOUT_TYPE_INITIALIZATION, LAYOUT_TYPE_ADDED, LAYOUT_TYPE_REMOVED, LAYOUT_TYPE_IMPERATIVE } from '../LayoutManager/constants.mjs';

/**
 * This class handles the specific case of creating a group using {@link Group#fromObject} and is not meant to be used in any other case.
 * We could have used a boolean in the constructor, as we did previously, but we think the boolean
 * would stay in the group's constructor interface and create confusion, therefore it was removed.
 * This layout manager doesn't do anything and therefore keeps the exact layout the group had when {@link Group#toObject} was called.
 */
class NoopLayoutManager extends LayoutManager {
  performLayout() {}
}
const groupDefaultValues = {
  strokeWidth: 0,
  subTargetCheck: false,
  caterCacheForTextChildren: false,
  selected: false,
  useSelectedFlag: false,
  interactive: false
};

/**
 * @fires object:added
 * @fires object:removed
 * @fires layout:before
 * @fires layout:after
 */
class Group extends createCollectionMixin(FabricObject) {
  static getDefaults() {
    return {
      ...super.getDefaults(),
      ...Group.ownDefaults
    };
  }

  /**
   * Constructor
   *
   * @param {FabricObject[]} [objects] instance objects
   * @param {Object} [options] Options object
   */
  constructor() {
    let objects = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    super();
    /**
     * Used to optimize performance
     * set to `false` if you don't need contained objects to be targets of events
     * @default
     * @type boolean
     */
    /**
     * *PMW property added*
     * Whether to cater to the text children objects for caching.
     */
    /**
     * *PMW property added*
     * Whether the object is currently selected.
     * This is being used in GraphicItemSlideshowMediator to handle text editing.
     * The editing mode is entered on single click when the item is selected. So we use this flag to determine if the item is selected.
     */
    /**
     * *PMW property added*
     * Whether the PMW added selected flag should be used.
     */
    /**
     * Used to allow targeting of object inside groups.
     * set to true if you want to select an object inside a group.\
     * **REQUIRES** `subTargetCheck` set to true
     * This will be not removed but slowly replaced with a method setInteractive
     * that will take care of enabling subTargetCheck and necessary object events.
     * There is too much attached to group interactivity to just be evaluated by a
     * boolean in the code
     * @default
     * @deprecated
     * @type boolean
     */
    /**
     * Used internally to optimize performance
     * Once an object is selected, instance is rendered without the selected object.
     * This way instance is cached only once for the entire interaction with the selected object.
     * @private
     */
    _defineProperty(this, "_activeObjects", []);
    _defineProperty(this, "__objectSelectionTracker", void 0);
    _defineProperty(this, "__objectSelectionDisposer", void 0);
    Object.assign(this, Group.ownDefaults);
    this.setOptions(options);
    this.groupInit(objects, options);
  }

  /**
   * *PMW function added*
   * Called everytime a group object is deselected. The useSelectedFlag is used and only true when the group object is slideshow item. See docs of 'selected' property.
   */
  onDeselect(options) {
    if (this.useSelectedFlag) {
      this.selected = false;
    }
    return super.onDeselect(options);
  }

  /**
   * *PMW* function added
   * Expands cache dimensions to cater to any text children objects present inside the group.
   * This is to prevent any part of the font rendering outside the selector box getting cut.
   * @private
   * @return {Object}.x width of object to be cached
   * @return {Object}.y height of object to be cached
   * @return {Object}.width width of canvas
   * @return {Object}.height height of canvas
   * @return {Object}.zoomX zoomX zoom value to unscale the canvas before drawing cache
   * @return {Object}.zoomY zoomY zoom value to unscale the canvas before drawing cache
   */
  _getCacheCanvasDimensions() {
    if (this.caterCacheForTextChildren) {
      const dims = super._getCacheCanvasDimensions();
      let widthToAdd = 0;
      let heightToAdd = 0;
      const maxFontSize = this._getMaxExpandedFontSizeFromTextChildren();
      if (maxFontSize > 0) {
        widthToAdd = maxFontSize * dims.zoomX;
        heightToAdd = maxFontSize * dims.zoomY;
      }
      dims.width += widthToAdd;
      dims.height += heightToAdd;
      return dims;
    }
    return super._getCacheCanvasDimensions();
  }

  /**
   * *PMW funtion added*
   * Scans itself for children text items and returns the max font size from them. Multiplies the expansion factor with the fontsize if it exists for the font family. If there's no text, returns 0.
   * @private
   */
  _getMaxExpandedFontSizeFromTextChildren() {
    const groupObjects = this.getObjects();
    let maxFontSize = 0;
    for (const groupObject of groupObjects) {
      if ('fontSize' in groupObject) {
        const fontSize = groupObject.fontSize;
        if (fontSize > maxFontSize) {
          // @ts-ignore
          maxFontSize = fontSize * groupObject.cacheExpansionFactor;
        }
      } else if (groupObject instanceof Group) {
        const maxFontSizeInGroup = groupObject._getMaxExpandedFontSizeFromTextChildren();
        if (maxFontSizeInGroup > maxFontSize) {
          maxFontSize = maxFontSizeInGroup;
        }
      }
    }
    return maxFontSize;
  }

  /**
   * Shared code between group and active selection
   * Meant to be used by the constructor.
   */
  groupInit(objects, options) {
    var _options$layoutManage;
    this._objects = [...objects]; // Avoid unwanted mutations of Collection to affect the caller

    this.__objectSelectionTracker = this.__objectSelectionMonitor.bind(this, true);
    this.__objectSelectionDisposer = this.__objectSelectionMonitor.bind(this, false);
    this.forEachObject(object => {
      this.enterGroup(object, false);
    });

    // perform initial layout
    this.layoutManager = (_options$layoutManage = options.layoutManager) !== null && _options$layoutManage !== void 0 ? _options$layoutManage : new LayoutManager();
    this.layoutManager.performLayout({
      type: LAYOUT_TYPE_INITIALIZATION,
      target: this,
      targets: [...objects],
      // @TODO remove this concept from the layout manager.
      // Layout manager will calculate the correct position,
      // group options can override it later.
      x: options.left,
      y: options.top
    });
  }

  /**
   * Checks if object can enter group and logs relevant warnings
   * @private
   * @param {FabricObject} object
   * @returns
   */
  canEnterGroup(object) {
    if (object === this || this.isDescendantOf(object)) {
      //  prevent circular object tree
      log('error', 'Group: circular object trees are not supported, this call has no effect');
      return false;
    } else if (this._objects.indexOf(object) !== -1) {
      // is already in the objects array
      log('error', 'Group: duplicate objects are not supported inside group, this call has no effect');
      return false;
    }
    return true;
  }

  /**
   * Override this method to enhance performance (for groups with a lot of objects).
   * If Overriding, be sure not pass illegal objects to group - it will break your app.
   * @private
   */
  _filterObjectsBeforeEnteringGroup(objects) {
    return objects.filter((object, index, array) => {
      // can enter AND is the first occurrence of the object in the passed args (to prevent adding duplicates)
      return this.canEnterGroup(object) && array.indexOf(object) === index;
    });
  }

  /**
   * Add objects
   * @param {...FabricObject[]} objects
   */
  add() {
    for (var _len = arguments.length, objects = new Array(_len), _key = 0; _key < _len; _key++) {
      objects[_key] = arguments[_key];
    }
    const allowedObjects = this._filterObjectsBeforeEnteringGroup(objects);
    const size = super.add(...allowedObjects);
    this._onAfterObjectsChange(LAYOUT_TYPE_ADDED, allowedObjects);
    return size;
  }

  /**
   * Inserts an object into collection at specified index
   * @param {FabricObject[]} objects Object to insert
   * @param {Number} index Index to insert object at
   */
  insertAt(index) {
    for (var _len2 = arguments.length, objects = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      objects[_key2 - 1] = arguments[_key2];
    }
    const allowedObjects = this._filterObjectsBeforeEnteringGroup(objects);
    const size = super.insertAt(index, ...allowedObjects);
    this._onAfterObjectsChange(LAYOUT_TYPE_ADDED, allowedObjects);
    return size;
  }

  /**
   * Remove objects
   * @param {...FabricObject[]} objects
   * @returns {FabricObject[]} removed objects
   */
  remove() {
    const removed = super.remove(...arguments);
    this._onAfterObjectsChange(LAYOUT_TYPE_REMOVED, removed);
    return removed;
  }
  _onObjectAdded(object) {
    this.enterGroup(object, true);
    this.fire('object:added', {
      target: object
    });
    object.fire('added', {
      target: this
    });
  }

  /**
   * @private
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object should exit group without applying group's transform to it
   */
  _onObjectRemoved(object, removeParentTransform) {
    this.exitGroup(object, removeParentTransform);
    this.fire('object:removed', {
      target: object
    });
    object.fire('removed', {
      target: this
    });
  }

  /**
   * @private
   * @param {'added'|'removed'} type
   * @param {FabricObject[]} targets
   */
  _onAfterObjectsChange(type, targets) {
    this.layoutManager.performLayout({
      type,
      targets,
      target: this
    });
  }
  _onStackOrderChanged() {
    this._set('dirty', true);
  }

  /**
   * @private
   * @param {string} key
   * @param {*} value
   */
  _set(key, value) {
    const prev = this[key];
    super._set(key, value);
    if (key === 'canvas' && prev !== value) {
      (this._objects || []).forEach(object => {
        object._set(key, value);
      });
    }
    return this;
  }

  /**
   * @private
   */
  _shouldSetNestedCoords() {
    return this.subTargetCheck;
  }

  /**
   * Remove all objects
   * @returns {FabricObject[]} removed objects
   */
  removeAll() {
    this._activeObjects = [];
    return this.remove(...this._objects);
  }

  /**
   * keeps track of the selected objects
   * @private
   */
  __objectSelectionMonitor(selected, _ref) {
    let {
      target: object
    } = _ref;
    const activeObjects = this._activeObjects;
    if (selected) {
      activeObjects.push(object);
      this._set('dirty', true);
    } else if (activeObjects.length > 0) {
      const index = activeObjects.indexOf(object);
      if (index > -1) {
        activeObjects.splice(index, 1);
        this._set('dirty', true);
      }
    }
  }

  /**
   * @private
   * @param {boolean} watch
   * @param {FabricObject} object
   */
  _watchObject(watch, object) {
    //  make sure we listen only once
    watch && this._watchObject(false, object);
    if (watch) {
      object.on('selected', this.__objectSelectionTracker);
      object.on('deselected', this.__objectSelectionDisposer);
    } else {
      object.off('selected', this.__objectSelectionTracker);
      object.off('deselected', this.__objectSelectionDisposer);
    }
  }

  /**
   * @private
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object is in canvas coordinate plane
   */
  enterGroup(object, removeParentTransform) {
    object.group && object.group.remove(object);
    object._set('parent', this);
    this._enterGroup(object, removeParentTransform);
  }

  /**
   * @private
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object is in canvas coordinate plane
   */
  _enterGroup(object, removeParentTransform) {
    if (removeParentTransform) {
      // can this be converted to utils (sendObjectToPlane)?
      applyTransformToObject(object, multiplyTransformMatrices(invertTransform(this.calcTransformMatrix()), object.calcTransformMatrix()));
    }
    this._shouldSetNestedCoords() && object.setCoords();
    object._set('group', this);
    object._set('canvas', this.canvas);
    this._watchObject(true, object);
    const activeObject = this.canvas && this.canvas.getActiveObject && this.canvas.getActiveObject();
    // if we are adding the activeObject in a group
    if (activeObject && (activeObject === object || object.isDescendantOf(activeObject))) {
      this._activeObjects.push(object);
    }
  }

  /**
   * @private
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object should exit group without applying group's transform to it
   */
  exitGroup(object, removeParentTransform) {
    this._exitGroup(object, removeParentTransform);
    object._set('parent', undefined);
    object._set('canvas', undefined);
  }

  /**
   * Executes the inner fabric logic of exiting a group.
   * - Stop watching the object
   * - Remove the object from the optimization map this._activeObjects
   * - unset the group property of the object
   * @protected
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object should exit group without applying group's transform to it
   */
  _exitGroup(object, removeParentTransform) {
    object._set('group', undefined);
    if (!removeParentTransform) {
      applyTransformToObject(object, multiplyTransformMatrices(this.calcTransformMatrix(), object.calcTransformMatrix()));
      object.setCoords();
    }
    this._watchObject(false, object);
    const index = this._activeObjects.length > 0 ? this._activeObjects.indexOf(object) : -1;
    if (index > -1) {
      this._activeObjects.splice(index, 1);
    }
  }

  /**
   * Decide if the group should cache or not. Create its own cache level
   * needsItsOwnCache should be used when the object drawing method requires
   * a cache step.
   * Generally you do not cache objects in groups because the group is already cached.
   * @return {Boolean}
   */
  shouldCache() {
    const ownCache = FabricObject.prototype.shouldCache.call(this);
    if (ownCache) {
      for (let i = 0; i < this._objects.length; i++) {
        if (this._objects[i].willDrawShadow()) {
          this.ownCaching = false;
          return false;
        }
      }
    }
    return ownCache;
  }

  /**
   * Check if this object or a child object will cast a shadow
   * @return {Boolean}
   */
  willDrawShadow() {
    if (super.willDrawShadow()) {
      return true;
    }
    for (let i = 0; i < this._objects.length; i++) {
      if (this._objects[i].willDrawShadow()) {
        return true;
      }
    }
    return false;
  }
  isGroup() {
    return true;
  }

  /**
   * Check if instance or its group are caching, recursively up
   * @return {Boolean}
   */
  isOnACache() {
    return this.ownCaching || !!this.parent && this.parent.isOnACache();
  }

  /**
   * Execute the drawing operation for an object on a specified context
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  drawObject(ctx, forClipping, context) {
    this._renderBackground(ctx);
    for (let i = 0; i < this._objects.length; i++) {
      var _this$canvas;
      const obj = this._objects[i];
      // TODO: handle rendering edge case somehow
      if ((_this$canvas = this.canvas) !== null && _this$canvas !== void 0 && _this$canvas.preserveObjectStacking && obj.group !== this) {
        ctx.save();
        ctx.transform(...invertTransform(this.calcTransformMatrix()));
        obj.render(ctx);
        ctx.restore();
      } else if (obj.group === this) {
        obj.render(ctx);
      }
    }
    this._drawClipPath(ctx, this.clipPath, context);
  }

  /**
   * @override
   * @return {Boolean}
   */
  setCoords() {
    super.setCoords();
    this._shouldSetNestedCoords() && this.forEachObject(object => object.setCoords());
  }
  triggerLayout() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this.layoutManager.performLayout({
      target: this,
      type: LAYOUT_TYPE_IMPERATIVE,
      ...options
    });
  }

  /**
   * Renders instance on a given context
   * @param {CanvasRenderingContext2D} ctx context to render instance on
   */
  render(ctx) {
    this._transformDone = true;
    super.render(ctx);
    this._transformDone = false;
  }
  isTable() {
    return false;
  }

  /**
   *
   * @private
   * @param {'toObject'|'toDatalessObject'} [method]
   * @param {string[]} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @returns {FabricObject[]} serialized objects
   */
  __serializeObjects(method, propertiesToInclude) {
    const _includeDefaultValues = this.includeDefaultValues;
    return this._objects.filter(function (obj) {
      return !obj.excludeFromExport;
    }).map(function (obj) {
      const originalDefaults = obj.includeDefaultValues;
      obj.includeDefaultValues = _includeDefaultValues;
      const data = obj[method || 'toObject'](propertiesToInclude);
      obj.includeDefaultValues = originalDefaults;
      // delete data.version;
      return data;
    });
  }

  /**
   * Returns object representation of an instance
   * @param {string[]} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toObject() {
    let propertiesToInclude = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    const layoutManager = this.layoutManager.toObject();
    return {
      ...super.toObject(['subTargetCheck', 'interactive', ...propertiesToInclude]),
      ...(layoutManager.strategy !== 'fit-content' || this.includeDefaultValues ? {
        layoutManager
      } : {}),
      objects: this.__serializeObjects('toObject', propertiesToInclude)
    };
  }
  toString() {
    return `#<Group: (${this.complexity()})>`;
  }
  dispose() {
    this.layoutManager.unsubscribeTargets({
      targets: this.getObjects(),
      target: this
    });
    this._activeObjects = [];
    this.forEachObject(object => {
      this._watchObject(false, object);
      object.dispose();
    });
    super.dispose();
  }

  /**
   * @private
   */
  _createSVGBgRect(reviver) {
    if (!this.backgroundColor) {
      return '';
    }
    const fillStroke = Rect.prototype._toSVG.call(this);
    const commons = fillStroke.indexOf('COMMON_PARTS');
    fillStroke[commons] = 'for="group" ';
    const markup = fillStroke.join('');
    return reviver ? reviver(markup) : markup;
  }

  /**
   * Returns svg representation of an instance
   * @param {TSVGReviver} [reviver] Method for further parsing of svg representation.
   * @return {String} svg representation of an instance
   */
  _toSVG(reviver) {
    const svgString = ['<g ', 'COMMON_PARTS', ' >\n'];
    const bg = this._createSVGBgRect(reviver);
    bg && svgString.push('\t\t', bg);
    for (let i = 0; i < this._objects.length; i++) {
      svgString.push('\t\t', this._objects[i].toSVG(reviver));
    }
    svgString.push('</g>\n');
    return svgString;
  }

  /**
   * Returns styles-string for svg-export, specific version for group
   * @return {String}
   */
  getSvgStyles() {
    const opacity = typeof this.opacity !== 'undefined' && this.opacity !== 1 ? `opacity: ${this.opacity};` : '',
      visibility = this.visible ? '' : ' visibility: hidden;';
    return [opacity, this.getSvgFilter(), visibility].join('');
  }

  /**
   * Returns svg clipPath representation of an instance
   * @param {Function} [reviver] Method for further parsing of svg representation.
   * @return {String} svg representation of an instance
   */
  toClipPathSVG(reviver) {
    const svgString = [];
    const bg = this._createSVGBgRect(reviver);
    bg && svgString.push('\t', bg);
    for (let i = 0; i < this._objects.length; i++) {
      svgString.push('\t', this._objects[i].toClipPathSVG(reviver));
    }
    return this._createBaseClipPathSVGMarkup(svgString, {
      reviver
    });
  }

  /**
   * *PMW*
   * Aligns the items in the group horizontally.
   * @param {String} type Must be either 'left', 'right' or 'center'
   */
  horizontalAlignment(type) {
    var _this$canvas2;
    const groupWidth = this.width,
      objects = this._objects,
      padding = this.padding;
    let i = 0,
      corners,
      tl,
      offsetX;
    switch (type) {
      case 'left':
        for (i = 0; i < objects.length; i++) {
          corners = objects[i].getCornerPoints(objects[i].getCenterPoint());
          tl = corners.tl.x;
          const minX = Math.min(tl, corners.tr.x, corners.bl.x, corners.br.x);
          offsetX = minX < tl ? tl - minX : 0;
          objects[i].set('left', -groupWidth / 2 + padding + offsetX);
        }
        break;
      case 'right':
        for (i = 0; i < objects.length; i++) {
          corners = objects[i].getCornerPoints(objects[i].getCenterPoint());
          tl = corners.tl.x;
          const maxX = Math.max(tl, corners.tr.x, corners.bl.x, corners.br.x);
          offsetX = maxX > tl ? maxX - tl : 0;
          objects[i].set('left', groupWidth / 2 - offsetX - padding);
        }
        break;
      case 'center':
        for (i = 0; i < objects.length; i++) {
          corners = objects[i].getCornerPoints({
            x: 0,
            y: objects[i].top
          });
          objects[i].set('left', corners.tl.x);
        }
        break;
      default:
        return;
    }
    (_this$canvas2 = this.canvas) === null || _this$canvas2 === void 0 || _this$canvas2.fire('object:modified', {
      target: this
    });
  }

  /**
   * *PMW* Aligns the items in the group vertically.
   * @param {String} type Must be either 'top', 'bottom' or 'center'
   */
  verticalAlignment(type) {
    var _this$canvas3;
    const groupHeight = this.height,
      objects = this._objects,
      padding = this.padding;
    let i = 0,
      corners,
      tl,
      offsetY;
    switch (type) {
      case 'top':
        for (i = 0; i < objects.length; i++) {
          corners = objects[i].getCornerPoints(objects[i].getCenterPoint());
          tl = corners.tl.y;
          const minY = Math.min(tl, corners.tr.y, corners.bl.y, corners.br.y);
          offsetY = minY < tl ? tl - minY : 0;
          objects[i].set('top', -groupHeight / 2 + padding + offsetY);
        }
        break;
      case 'bottom':
        for (i = 0; i < objects.length; i++) {
          corners = objects[i].getCornerPoints(objects[i].getCenterPoint());
          tl = corners.tl.y;
          const maxY = Math.max(tl, corners.tr.y, corners.bl.y, corners.br.y);
          offsetY = maxY > tl ? maxY - tl : 0;
          objects[i].set('top', groupHeight / 2 - padding - offsetY);
        }
        break;
      case 'center':
        for (i = 0; i < objects.length; i++) {
          corners = objects[i].getCornerPoints({
            x: objects[i].left,
            y: 0
          });
          objects[i].set('top', corners.tl.y);
        }
        break;
      default:
        return;
    }
    (_this$canvas3 = this.canvas) === null || _this$canvas3 === void 0 || _this$canvas3.fire('object:modified', {
      target: this
    });
  }

  /**
   * @todo support loading from svg
   * @private
   * @static
   * @memberOf Group
   * @param {Object} object Object to create a group from
   * @returns {Promise<Group>}
   */
  static fromObject(_ref2, abortable) {
    let {
      type,
      objects = [],
      layoutManager,
      ...options
    } = _ref2;
    return Promise.all([enlivenObjects(objects, abortable), enlivenObjectEnlivables(options, abortable)]).then(_ref3 => {
      let [objects, hydratedOptions] = _ref3;
      const group = new this(objects, {
        ...options,
        ...hydratedOptions,
        layoutManager: new NoopLayoutManager()
      });
      if (layoutManager) {
        const layoutClass = classRegistry.getClass(layoutManager.type);
        const strategyClass = classRegistry.getClass(layoutManager.strategy);
        group.layoutManager = new layoutClass(new strategyClass());
      } else {
        group.layoutManager = new LayoutManager();
      }
      group.layoutManager.subscribeTargets({
        type: LAYOUT_TYPE_INITIALIZATION,
        target: group,
        targets: group.getObjects()
      });
      group.setCoords();
      return group;
    });
  }
}
_defineProperty(Group, "type", 'Group');
_defineProperty(Group, "ownDefaults", groupDefaultValues);
classRegistry.setClass(Group);

export { Group, groupDefaultValues };
//# sourceMappingURL=Group.mjs.map
