import { NONE, LEFT, TOP } from '../../constants.mjs';
import { getDocumentFromElement, getWindowFromElement, getScrollLeftTop } from '../../util/dom_misc.mjs';
import { setStyle } from '../../util/dom_style.mjs';

const setCanvasDimensions = function (el, ctx, _ref) {
  let {
    width,
    height
  } = _ref;
  let retinaScaling = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
  el.width = width;
  el.height = height;
  if (retinaScaling > 1) {
    el.setAttribute('width', (width * retinaScaling).toString());
    el.setAttribute('height', (height * retinaScaling).toString());
    ctx.scale(retinaScaling, retinaScaling);
  }
};
function allowTouchScrolling(element, allow) {
  const touchAction = allow ? 'manipulation' : NONE;
  setStyle(element, {
    'touch-action': touchAction,
    '-ms-touch-action': touchAction
  });
}
const setCSSDimensions = (el, _ref2) => {
  let {
    width,
    height
  } = _ref2;
  width && (el.style.width = typeof width === 'number' ? "".concat(width, "px") : width);
  height && (el.style.height = typeof height === 'number' ? "".concat(height, "px") : height);
};

/**
 * Returns offset for a given element
 * @param {HTMLElement} element Element to get offset for
 * @return {Object} Object with "left" and "top" properties
 */
function getElementOffset(element) {
  var _getWindowFromElement;
  let box = {
    left: 0,
    top: 0
  };
  const doc = element && getDocumentFromElement(element),
    offset = {
      left: 0,
      top: 0
    },
    offsetAttributes = {
      borderLeftWidth: LEFT,
      borderTopWidth: TOP,
      paddingLeft: LEFT,
      paddingTop: TOP
    };
  if (!doc) {
    return offset;
  }
  const elemStyle = ((_getWindowFromElement = getWindowFromElement(element)) === null || _getWindowFromElement === void 0 ? void 0 : _getWindowFromElement.getComputedStyle(element, null)) || {};
  for (const attr in offsetAttributes) {
    // @ts-expect-error TS learn to iterate!
    offset[offsetAttributes[attr]] += parseInt(elemStyle[attr], 10) || 0;
  }
  const docElem = doc.documentElement;
  if (typeof element.getBoundingClientRect !== 'undefined') {
    box = element.getBoundingClientRect();
  }
  const scrollLeftTop = getScrollLeftTop(element);
  return {
    left: box.left + scrollLeftTop.left - (docElem.clientLeft || 0) + offset.left,
    top: box.top + scrollLeftTop.top - (docElem.clientTop || 0) + offset.top
  };
}

/**
 * Makes element unselectable
 * @param {HTMLElement} element Element to make unselectable
 * @return {HTMLElement} Element that was passed in
 */
function makeElementUnselectable(element) {
  if (typeof element.onselectstart !== 'undefined') {
    element.onselectstart = () => false;
  }
  element.style.userSelect = NONE;
  return element;
}

export { allowTouchScrolling, getElementOffset, makeElementUnselectable, setCSSDimensions, setCanvasDimensions };
//# sourceMappingURL=util.mjs.map
