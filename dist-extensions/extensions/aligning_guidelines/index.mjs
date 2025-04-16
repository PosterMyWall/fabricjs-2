import { util } from '@postermywall/fabricjs-2';
import { aligningLineConfig } from './constant.mjs';
import { drawPointList, drawVerticalLine, drawHorizontalLine } from './util/draw.mjs';
import { getObjectsByTarget } from './util/get-objects-by-target.mjs';
import { collectLine } from './util/collect-line.mjs';

function initAligningGuidelines(canvas) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  Object.assign(aligningLineConfig, options);
  const horizontalLines = new Set();
  const verticalLines = new Set();
  let onlyDrawPoint = false;
  const cacheMap = new Map();
  const getCaCheMapValue = object => {
    const cacheKey = [object.calcTransformMatrix().toString(), object.width, object.height].join();
    const cacheValue = cacheMap.get(cacheKey);
    if (cacheValue) return cacheValue;
    const coords = object.getCoords();
    const rect = util.makeBoundingBoxFromPoints(coords);
    const value = [rect, coords];
    cacheMap.set(cacheKey, value);
    return value;
  };
  function moving(e) {
    const activeObject = e.target;
    activeObject.setCoords();
    onlyDrawPoint = false;
    verticalLines.clear();
    horizontalLines.clear();
    const objects = getObjectsByTarget(activeObject);
    const activeObjectRect = activeObject.getBoundingRect();
    for (const object of objects) {
      const objectRect = getCaCheMapValue(object)[0];
      const {
        vLines,
        hLines
      } = collectLine({
        activeObject,
        activeObjectRect,
        objectRect
      });
      vLines.forEach(o => {
        verticalLines.add(JSON.stringify(o));
      });
      hLines.forEach(o => {
        horizontalLines.add(JSON.stringify(o));
      });
    }
  }
  function beforeRender() {
    canvas.clearContext(canvas.contextTop);
  }
  function afterRender() {
    if (onlyDrawPoint) {
      const list = [];
      for (const v of verticalLines) list.push(JSON.parse(v));
      for (const h of horizontalLines) list.push(JSON.parse(h));
      drawPointList(canvas, list);
    } else {
      for (const v of verticalLines) drawVerticalLine(canvas, JSON.parse(v));
      for (const h of horizontalLines) drawHorizontalLine(canvas, JSON.parse(h));
    }
  }
  function mouseUp() {
    verticalLines.clear();
    horizontalLines.clear();
    cacheMap.clear();
    canvas.requestRenderAll();
  }

  // canvas.on('object:resizing', scalingOrResizing);
  // canvas.on('object:scaling', scalingOrResizing);
  canvas.on('object:moving', moving);
  canvas.on('before:render', beforeRender);
  canvas.on('after:render', afterRender);
  canvas.on('mouse:up', mouseUp);
  return () => {
    // canvas.off('object:resizing', scalingOrResizing);
    // canvas.off('object:scaling', scalingOrResizing);
    canvas.off('object:moving', moving);
    canvas.off('before:render', beforeRender);
    canvas.off('after:render', afterRender);
    canvas.off('mouse:up', mouseUp);
  };
}

export { initAligningGuidelines };
//# sourceMappingURL=index.mjs.map
