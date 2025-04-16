import { getFabricDocument } from '../../env/index.mjs';
import { FabricError } from '../internals/console.mjs';

/**
 * Creates canvas element
 * @return {CanvasElement} initialized canvas element
 */
const createCanvasElement = () => {
  const element = getFabricDocument().createElement('canvas');
  if (!element || typeof element.getContext === 'undefined') {
    throw new FabricError('Failed to create `canvas` element');
  }
  return element;
};

/**
 * Creates image element (works on client and node)
 * @return {HTMLImageElement} HTML image element
 */
const createImage = () => getFabricDocument().createElement('img');

/**
 * Creates a canvas element as big as another
 * @param {CanvasElement} canvas to copy size and content of
 * @return {CanvasElement} initialized canvas element
 */
const createCanvasElementFor = canvas => {
  const newCanvas = createCanvasElement();
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  return newCanvas;
};

/**
 * since 2.6.0 moved from canvas instance to utility.
 * possibly useless
 * @param {CanvasElement} canvasEl to copy size and content of
 * @param {String} format 'jpeg' or 'png', in some browsers 'webp' is ok too
 * @param {number} quality <= 1 and > 0
 * @return {String} data url
 */
const toDataURL = (canvasEl, format, quality) => canvasEl.toDataURL(`image/${format}`, quality);
const isHTMLCanvas = canvas => {
  return !!canvas && canvas.getContext !== undefined;
};
const toBlob = (canvasEl, format, quality) => new Promise((resolve, _) => {
  canvasEl.toBlob(resolve, `image/${format}`, quality);
});

export { createCanvasElement, createCanvasElementFor, createImage, isHTMLCanvas, toBlob, toDataURL };
//# sourceMappingURL=dom.mjs.map
