import { Point } from '../../Point.mjs';

/**
 * Calculates bounding box (left, top, width, height) from given `points`
 * @param {XY[]} points
 * @return {Object} Object with left, top, width, height properties
 */
const makeBoundingBoxFromPoints = points => {
  if (points.length === 0) {
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0
    };
  }
  const {
    min,
    max
  } = points.reduce((_ref, curr) => {
    let {
      min,
      max
    } = _ref;
    return {
      min: min.min(curr),
      max: max.max(curr)
    };
  }, {
    min: new Point(points[0]),
    max: new Point(points[0])
  });
  const size = max.subtract(min);
  return {
    left: min.x,
    top: min.y,
    width: size.x,
    height: size.y
  };
};

export { makeBoundingBoxFromPoints };
//# sourceMappingURL=boundingBoxFromPoints.mjs.map
