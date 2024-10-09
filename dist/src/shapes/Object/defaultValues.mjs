import { TOP, LEFT, SCALE_X, SCALE_Y, SKEW_X, SKEW_Y, FILL, STROKE } from '../../constants.mjs';

const stateProperties = [TOP, LEFT, SCALE_X, SCALE_Y, 'flipX', 'flipY', 'originX', 'originY', 'angle', 'opacity', 'globalCompositeOperation', 'shadow', 'visible', SKEW_X, SKEW_Y];
const cacheProperties = [FILL, STROKE, 'strokeWidth', 'strokeDashArray', 'width', 'height', 'paintFirst', 'strokeUniform', 'strokeLineCap', 'strokeDashOffset', 'strokeLineJoin', 'strokeMiterLimit', 'backgroundColor', 'clipPath'];
const fabricObjectDefaultValues = {
  // see composeMatrix() to see order of transforms. First defaults listed based on this
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  angle: 0,
  flipX: false,
  flipY: false,
  scaleX: 1,
  scaleY: 1,
  minScaleLimit: 0,
  skewX: 0,
  skewY: 0,
  originX: LEFT,
  originY: TOP,
  strokeWidth: 1,
  strokeUniform: false,
  padding: 0,
  opacity: 1,
  paintFirst: FILL,
  fill: 'rgb(0,0,0)',
  fillRule: 'nonzero',
  __PMWID: '',
  erasable: false,
  stroke: null,
  strokeDashArray: null,
  leanBackground: false,
  leanBackgroundOffset: 0,
  strokeDashOffset: 0,
  strokeLineCap: 'butt',
  strokeLineJoin: 'miter',
  pmwBmBtnText: '',
  pmwBmBtnIcon: '',
  strokeMiterLimit: 4,
  globalCompositeOperation: 'source-over',
  backgroundColor: '',
  shadow: null,
  uniformScaling: true,
  visible: true,
  includeDefaultValues: true,
  excludeFromExport: false,
  objectCaching: true,
  clipPath: undefined,
  inverted: false,
  absolutePositioned: false,
  centeredRotation: true,
  centeredScaling: false,
  dirty: true
};
const interactiveObjectDefaultValues = {
  noScaleCache: true,
  lockMovementX: false,
  lockMovementY: false,
  lockRotation: false,
  lockScalingX: false,
  lockScalingY: false,
  lockSkewingX: false,
  lockSkewingY: false,
  lockScalingFlip: false,
  cornerSize: 13,
  touchCornerSize: 24,
  transparentCorners: true,
  cornerColor: 'rgb(178,204,255)',
  cornerStrokeColor: '',
  cornerStyle: 'rect',
  cornerDashArray: null,
  hasControls: true,
  borderColor: 'rgb(178,204,255)',
  borderDashArray: null,
  borderOpacityWhenMoving: 0.4,
  borderScaleFactor: 1,
  hasBorders: true,
  selectionBackgroundColor: '',
  selectable: true,
  evented: true,
  perPixelTargetFind: false,
  activeOn: 'down',
  hoverCursor: null,
  moveCursor: null
};

export { cacheProperties, fabricObjectDefaultValues, interactiveObjectDefaultValues, stateProperties };
//# sourceMappingURL=defaultValues.mjs.map
