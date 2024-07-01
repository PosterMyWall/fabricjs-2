/**
 * Returns element scroll offsets
 * @param {HTMLElement} element Element to operate on
 * @return {Object} Object with left/top values
 */
function getScrollLeftTop(element) {
  const doc = element && getDocumentFromElement(element);
  let left = 0,
    top = 0;
  if (!element || !doc) {
    return {
      left,
      top
    };
  }
  const docElement = doc.documentElement,
    body = doc.body || {
      scrollLeft: 0,
      scrollTop: 0
    };
  // While loop checks (and then sets element to) .parentNode OR .host
  //  to account for ShadowDOM. We still want to traverse up out of ShadowDOM,
  //  but the .parentNode of a root ShadowDOM node will always be null, instead
  //  it should be accessed through .host. See http://stackoverflow.com/a/24765528/4383938
  // @ts-expect-error Set element to element parent, or 'host' in case of ShadowDOM
  while (element && (element.parentNode || element.host)) {
    // @ts-expect-error Set element to element parent, or 'host' in case of ShadowDOM
    element = element.parentNode || element.host;
    // @ts-expect-error because element is typed as HTMLElement but it can go up to document
    if (element === doc) {
      left = body.scrollLeft || docElement.scrollLeft || 0;
      top = body.scrollTop || docElement.scrollTop || 0;
    } else {
      left += element.scrollLeft || 0;
      top += element.scrollTop || 0;
    }
    if (element.nodeType === 1 && element.style.position === 'fixed') {
      break;
    }
  }
  return {
    left,
    top
  };
}
const getDocumentFromElement = el => el.ownerDocument || null;
const getWindowFromElement = el => {
  var _el$ownerDocument;
  return ((_el$ownerDocument = el.ownerDocument) === null || _el$ownerDocument === void 0 ? void 0 : _el$ownerDocument.defaultView) || null;
};

export { getDocumentFromElement, getScrollLeftTop, getWindowFromElement };
//# sourceMappingURL=dom_misc.mjs.map
