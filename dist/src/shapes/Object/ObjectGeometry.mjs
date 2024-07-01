import { iMatrix } from '../../constants.mjs';
import { Intersection } from '../../Intersection.mjs';
import { Point } from '../../Point.mjs';
import { makeBoundingBoxFromPoints } from '../../util/misc/boundingBoxFromPoints.mjs';
import { transformPoint, invertTransform, calcPlaneRotation, createRotateMatrix, multiplyTransformMatrices, composeMatrix, createTranslateMatrix } from '../../util/misc/matrix.mjs';
import { radiansToDegrees } from '../../util/misc/radiansDegreesConversion.mjs';
import { ObjectOrigin } from './ObjectOrigin.mjs';
import { resolveOrigin } from '../../util/misc/resolveOrigin.mjs';

class ObjectGeometry extends ObjectOrigin {
  /**
   * Describe object's corner position in scene coordinates.
   * The coordinates are derived from the following:
   * left, top, width, height, scaleX, scaleY, skewX, skewY, angle, strokeWidth.
   * The coordinates do not depend on viewport changes.
   * The coordinates get updated with {@link setCoords}.
   * You can calculate them without updating with {@link calcACoords()}
   */

  /**
   * storage cache for object transform matrix
   */

  /**
   * storage cache for object full transform matrix
   */

  /**
   * A Reference of the Canvas where the object is actually added
   * @type StaticCanvas | Canvas;
   * @default undefined
   * @private
   */

  /**
   * @returns {number} x position according to object's {@link originX} property in canvas coordinate plane
   */
  getX() {
    return this.getXY().x;
  }

  /**
   * @param {number} value x position according to object's {@link originX} property in canvas coordinate plane
   */
  setX(value) {
    this.setXY(this.getXY().setX(value));
  }

  /**
   * @returns {number} y position according to object's {@link originY} property in canvas coordinate plane
   */
  getY() {
    return this.getXY().y;
  }

  /**
   * @param {number} value y position according to object's {@link originY} property in canvas coordinate plane
   */
  setY(value) {
    this.setXY(this.getXY().setY(value));
  }

  /**
   * @returns {number} x position according to object's {@link originX} property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link getX}
   */
  getRelativeX() {
    return this.left;
  }

  /**
   * @param {number} value x position according to object's {@link originX} property in parent's coordinate plane\
   * if parent is canvas then this method is identical to {@link setX}
   */
  setRelativeX(value) {
    this.left = value;
  }

  /**
   * @returns {number} y position according to object's {@link originY} property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link getY}
   */
  getRelativeY() {
    return this.top;
  }

  /**
   * @param {number} value y position according to object's {@link originY} property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link setY}
   */
  setRelativeY(value) {
    this.top = value;
  }

  /**
   * @returns {Point} x position according to object's {@link originX} {@link originY} properties in canvas coordinate plane
   */
  getXY() {
    const relativePosition = this.getRelativeXY();
    return this.group ? transformPoint(relativePosition, this.group.calcTransformMatrix()) : relativePosition;
  }

  /**
   * Set an object position to a particular point, the point is intended in absolute ( canvas ) coordinate.
   * You can specify {@link originX} and {@link originY} values,
   * that otherwise are the object's current values.
   * @example <caption>Set object's bottom left corner to point (5,5) on canvas</caption>
   * object.setXY(new Point(5, 5), 'left', 'bottom').
   * @param {Point} point position in canvas coordinate plane
   * @param {TOriginX} [originX] Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginY} [originY] Vertical origin: 'top', 'center' or 'bottom'
   */
  setXY(point, originX, originY) {
    if (this.group) {
      point = transformPoint(point, invertTransform(this.group.calcTransformMatrix()));
    }
    this.setRelativeXY(point, originX, originY);
  }

  /**
   * @returns {Point} x,y position according to object's {@link originX} {@link originY} properties in parent's coordinate plane
   */
  getRelativeXY() {
    return new Point(this.left, this.top);
  }

  /**
   * As {@link setXY}, but in current parent's coordinate plane (the current group if any or the canvas)
   * @param {Point} point position according to object's {@link originX} {@link originY} properties in parent's coordinate plane
   * @param {TOriginX} [originX] Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginY} [originY] Vertical origin: 'top', 'center' or 'bottom'
   */
  setRelativeXY(point) {
    let originX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.originX;
    let originY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.originY;
    this.setPositionByOrigin(point, originX, originY);
  }

  /**
   * @deprecated intermidiate method to be removed, do not use
   */
  isStrokeAccountedForInDimensions() {
    return false;
  }

  /**
   * @return {Point[]} [tl, tr, br, bl] in the scene plane
   */
  getCoords() {
    const {
      tl,
      tr,
      br,
      bl
    } = this.aCoords || (this.aCoords = this.calcACoords());
    const coords = [tl, tr, br, bl];
    if (this.group) {
      const t = this.group.calcTransformMatrix();
      return coords.map(p => transformPoint(p, t));
    }
    return coords;
  }

  /**
   * Checks if object intersects with the scene rect formed by {@link tl} and {@link br}
   */
  intersectsWithRect(tl, br) {
    const intersection = Intersection.intersectPolygonRectangle(this.getCoords(), tl, br);
    return intersection.status === 'Intersection';
  }

  /**
   * Checks if object intersects with another object
   * @param {Object} other Object to test
   * @return {Boolean} true if object intersects with another object
   */
  intersectsWithObject(other) {
    const intersection = Intersection.intersectPolygonPolygon(this.getCoords(), other.getCoords());
    return intersection.status === 'Intersection' || intersection.status === 'Coincident' || other.isContainedWithinObject(this) || this.isContainedWithinObject(other);
  }

  /**
   * Checks if object is fully contained within area of another object
   * @param {Object} other Object to test
   * @return {Boolean} true if object is fully contained within area of another object
   */
  isContainedWithinObject(other) {
    const points = this.getCoords();
    return points.every(point => other.containsPoint(point));
  }

  /**
   * Checks if object is fully contained within the scene rect formed by {@link tl} and {@link br}
   */
  isContainedWithinRect(tl, br) {
    const {
      left,
      top,
      width,
      height
    } = this.getBoundingRect();
    return left >= tl.x && left + width <= br.x && top >= tl.y && top + height <= br.y;
  }
  isOverlapping(other) {
    return this.intersectsWithObject(other) || this.isContainedWithinObject(other) || other.isContainedWithinObject(this);
  }

  /**
   * Checks if point is inside the object
   * @param {Point} point Point to check against
   * @return {Boolean} true if point is inside the object
   */
  containsPoint(point) {
    return Intersection.isPointInPolygon(point, this.getCoords());
  }

  /**
   * Checks if object is contained within the canvas with current viewportTransform
   * the check is done stopping at first point that appears on screen
   * @return {Boolean} true if object is fully or partially contained within canvas
   */
  isOnScreen() {
    if (!this.canvas) {
      return false;
    }
    const {
      tl,
      br
    } = this.canvas.vptCoords;
    const points = this.getCoords();
    // if some point is on screen, the object is on screen.
    if (points.some(point => point.x <= br.x && point.x >= tl.x && point.y <= br.y && point.y >= tl.y)) {
      return true;
    }
    // no points on screen, check intersection with absolute coordinates
    if (this.intersectsWithRect(tl, br)) {
      return true;
    }
    // check if the object is so big that it contains the entire viewport
    return this.containsPoint(tl.midPointFrom(br));
  }

  /**
   * Checks if object is partially contained within the canvas with current viewportTransform
   * @return {Boolean} true if object is partially contained within canvas
   */
  isPartiallyOnScreen() {
    if (!this.canvas) {
      return false;
    }
    const {
      tl,
      br
    } = this.canvas.vptCoords;
    if (this.intersectsWithRect(tl, br)) {
      return true;
    }
    const allPointsAreOutside = this.getCoords().every(point => (point.x >= br.x || point.x <= tl.x) && (point.y >= br.y || point.y <= tl.y));
    // check if the object is so big that it contains the entire viewport
    return allPointsAreOutside && this.containsPoint(tl.midPointFrom(br));
  }

  /**
   * Returns coordinates of object's bounding rectangle (left, top, width, height)
   * the box is intended as aligned to axis of canvas.
   * @return {Object} Object with left, top, width, height properties
   */
  getBoundingRect() {
    return makeBoundingBoxFromPoints(this.getCoords());
  }

  /**
   * Returns width of an object's bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} width value
   */
  getScaledWidth() {
    return this._getTransformedDimensions().x;
  }

  /**
   * Returns height of an object bounding box counting transformations
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} height value
   */
  getScaledHeight() {
    return this._getTransformedDimensions().y;
  }

  /**
   * Scales an object (equally by x and y)
   * @param {Number} value Scale factor
   * @return {void}
   */
  scale(value) {
    this._set('scaleX', value);
    this._set('scaleY', value);
    this.setCoords();
  }

  /**
   * Scales an object to a given width, with respect to bounding box (scaling by x/y equally)
   * @param {Number} value New width value
   * @return {void}
   */
  scaleToWidth(value) {
    // adjust to bounding rect factor so that rotated shapes would fit as well
    const boundingRectFactor = this.getBoundingRect().width / this.getScaledWidth();
    return this.scale(value / this.width / boundingRectFactor);
  }

  /**
   * Scales an object to a given height, with respect to bounding box (scaling by x/y equally)
   * @param {Number} value New height value
   * @return {void}
   */
  scaleToHeight(value) {
    // adjust to bounding rect factor so that rotated shapes would fit as well
    const boundingRectFactor = this.getBoundingRect().height / this.getScaledHeight();
    return this.scale(value / this.height / boundingRectFactor);
  }
  getCanvasRetinaScaling() {
    var _this$canvas;
    return ((_this$canvas = this.canvas) === null || _this$canvas === void 0 ? void 0 : _this$canvas.getRetinaScaling()) || 1;
  }

  /**
   * Returns the object angle relative to canvas counting also the group property
   * @returns {TDegree}
   */
  getTotalAngle() {
    return this.group ? radiansToDegrees(calcPlaneRotation(this.calcTransformMatrix())) : this.angle;
  }

  /**
   * Retrieves viewportTransform from Object's canvas if available
   * @return {TMat2D}
   */
  getViewportTransform() {
    var _this$canvas2;
    return ((_this$canvas2 = this.canvas) === null || _this$canvas2 === void 0 ? void 0 : _this$canvas2.viewportTransform) || iMatrix.concat();
  }

  /**
   * Calculates the coordinates of the 4 corner of the bbox, in absolute coordinates.
   * those never change with zoom or viewport changes.
   * @return {TCornerPoint}
   */
  calcACoords() {
    const rotateMatrix = createRotateMatrix({
        angle: this.angle
      }),
      {
        x,
        y
      } = this.getRelativeCenterPoint(),
      tMatrix = createTranslateMatrix(x, y),
      finalMatrix = multiplyTransformMatrices(tMatrix, rotateMatrix),
      dim = this._getTransformedDimensions(),
      w = dim.x / 2,
      h = dim.y / 2;
    return {
      // corners
      tl: transformPoint({
        x: -w,
        y: -h
      }, finalMatrix),
      tr: transformPoint({
        x: w,
        y: -h
      }, finalMatrix),
      bl: transformPoint({
        x: -w,
        y: h
      }, finalMatrix),
      br: transformPoint({
        x: w,
        y: h
      }, finalMatrix)
    };
  }

  /**
   * Sets corner and controls position coordinates based on current angle, width and height, left and top.
   * aCoords are used to quickly find an object on the canvas.
   * See {@link https://github.com/fabricjs/fabric.js/wiki/When-to-call-setCoords} and {@link http://fabricjs.com/fabric-gotchas}
   */
  setCoords() {
    this.aCoords = this.calcACoords();
  }
  transformMatrixKey() {
    let skipGroup = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    let prefix = [];
    if (!skipGroup && this.group) {
      prefix = this.group.transformMatrixKey(skipGroup);
    }
    prefix.push(this.top, this.left, this.width, this.height, this.scaleX, this.scaleY, this.angle, this.strokeWidth, this.skewX, this.skewY, +this.flipX, +this.flipY, resolveOrigin(this.originX), resolveOrigin(this.originY));
    return prefix;
  }

  /**
   * calculate transform matrix that represents the current transformations from the
   * object's properties.
   * @param {Boolean} [skipGroup] return transform matrix for object not counting parent transformations
   * There are some situation in which this is useful to avoid the fake rotation.
   * @return {TMat2D} transform matrix for the object
   */
  calcTransformMatrix() {
    let skipGroup = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    let matrix = this.calcOwnMatrix();
    if (skipGroup || !this.group) {
      return matrix;
    }
    const key = this.transformMatrixKey(skipGroup),
      cache = this.matrixCache;
    if (cache && cache.key.every((x, i) => x === key[i])) {
      return cache.value;
    }
    if (this.group) {
      matrix = multiplyTransformMatrices(this.group.calcTransformMatrix(false), matrix);
    }
    this.matrixCache = {
      key,
      value: matrix
    };
    return matrix;
  }

  /**
   * calculate transform matrix that represents the current transformations from the
   * object's properties, this matrix does not include the group transformation
   * @return {TMat2D} transform matrix for the object
   */
  calcOwnMatrix() {
    const key = this.transformMatrixKey(true),
      cache = this.ownMatrixCache;
    if (cache && cache.key === key) {
      return cache.value;
    }
    const center = this.getRelativeCenterPoint(),
      options = {
        angle: this.angle,
        translateX: center.x,
        translateY: center.y,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        skewX: this.skewX,
        skewY: this.skewY,
        flipX: this.flipX,
        flipY: this.flipY
      },
      value = composeMatrix(options);
    this.ownMatrixCache = {
      key,
      value
    };
    return value;
  }

  /**
   * Calculate object dimensions from its properties
   * @private
   * @returns {Point} dimensions
   */
  _getNonTransformedDimensions() {
    return new Point(this.width, this.height).scalarAdd(this.strokeWidth);
  }

  /**
   * Calculate object dimensions for controls box, including padding and canvas zoom.
   * and active selection
   * @private
   * @param {object} [options] transform options
   * @returns {Point} dimensions
   */
  _calculateCurrentDimensions(options) {
    return this._getTransformedDimensions(options).transform(this.getViewportTransform(), true).scalarAdd(2 * this.padding);
  }
}

export { ObjectGeometry };
//# sourceMappingURL=ObjectGeometry.mjs.map
