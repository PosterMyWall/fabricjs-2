import { getSvgRegex } from './getSvgRegex.mjs';
import { TOP, LEFT } from '../constants.mjs';
import { TEXT_DECORATION_THICKNESS } from '../shapes/Text/constants.mjs';

// matches, e.g.: +14.56e-12, etc.
const reNum = String.raw`[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?`;
const viewportSeparator = String.raw`(?:\s*,?\s+|\s*,\s*)`;
const svgNS = 'http://www.w3.org/2000/svg';
const reFontDeclaration = new RegExp('(normal|italic)?\\s*(normal|small-caps)?\\s*' + '(normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900)?\\s*(' + reNum + '(?:px|cm|mm|em|pt|pc|in)*)(?:\\/(normal|' + reNum + '))?\\s+(.*)');
const svgValidTagNames = ['path', 'circle', 'polygon', 'polyline', 'ellipse', 'rect', 'line', 'image', 'text'],
  svgViewBoxElements = ['symbol', 'image', 'marker', 'pattern', 'view', 'svg'],
  svgInvalidAncestors = ['pattern', 'defs', 'symbol', 'metadata', 'clipPath', 'mask', 'desc'],
  svgValidParents = ['symbol', 'g', 'a', 'svg', 'clipPath', 'defs'],
  attributesMap = {
    cx: LEFT,
    x: LEFT,
    r: 'radius',
    cy: TOP,
    y: TOP,
    display: 'visible',
    visibility: 'visible',
    transform: 'transformMatrix',
    'fill-opacity': 'fillOpacity',
    'fill-rule': 'fillRule',
    'font-family': 'fontFamily',
    'font-size': 'fontSize',
    'font-style': 'fontStyle',
    'font-weight': 'fontWeight',
    'letter-spacing': 'charSpacing',
    'paint-order': 'paintFirst',
    'stroke-dasharray': 'strokeDashArray',
    'stroke-dashoffset': 'strokeDashOffset',
    'stroke-linecap': 'strokeLineCap',
    'stroke-linejoin': 'strokeLineJoin',
    'stroke-miterlimit': 'strokeMiterLimit',
    'stroke-opacity': 'strokeOpacity',
    'stroke-width': 'strokeWidth',
    'text-decoration': 'textDecoration',
    'text-anchor': 'textAnchor',
    opacity: 'opacity',
    'clip-path': 'clipPath',
    'clip-rule': 'clipRule',
    'vector-effect': 'strokeUniform',
    'image-rendering': 'imageSmoothing',
    'text-decoration-thickness': TEXT_DECORATION_THICKNESS
  },
  fSize = 'font-size',
  cPath = 'clip-path';
const svgValidTagNamesRegEx = getSvgRegex(svgValidTagNames);
const svgViewBoxElementsRegEx = getSvgRegex(svgViewBoxElements);
const svgValidParentsRegEx = getSvgRegex(svgValidParents);

// http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute

const reViewBoxAttrValue = new RegExp(String.raw`^\s*(${reNum})${viewportSeparator}(${reNum})${viewportSeparator}(${reNum})${viewportSeparator}(${reNum})\s*$`);

export { attributesMap, cPath, fSize, reFontDeclaration, reNum, reViewBoxAttrValue, svgInvalidAncestors, svgNS, svgValidParents, svgValidParentsRegEx, svgValidTagNames, svgValidTagNamesRegEx, svgViewBoxElements, svgViewBoxElementsRegEx, viewportSeparator };
//# sourceMappingURL=constants.mjs.map
