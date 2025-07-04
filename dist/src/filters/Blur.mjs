import { defineProperty as _defineProperty } from '../../_virtual/_rollupPluginBabelHelpers.mjs';
import { BaseFilter } from './BaseFilter.mjs';
import { isWebGLPipelineState } from './utils.mjs';
import { classRegistry } from '../ClassRegistry.mjs';
import { fragmentSource } from './shaders/blur.mjs';

const blurDefaultValues = {
  blur: 0
};

/**
 * Blur filter class
 * @example
 * const filter = new Blur({
 *   blur: 0.5
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 */
class Blur extends BaseFilter {
  getFragmentSource() {
    return fragmentSource;
  }
  applyTo(options) {
    if (isWebGLPipelineState(options)) {
      // this aspectRatio is used to give the same blur to vertical and horizontal
      this.aspectRatio = options.sourceWidth / options.sourceHeight;
      options.passes++;
      this._setupFrameBuffer(options);
      this.horizontal = true;
      this.applyToWebGL(options);
      this._swapTextures(options);
      this._setupFrameBuffer(options);
      this.horizontal = false;
      this.applyToWebGL(options);
      this._swapTextures(options);
    } else {
      this.applyTo2d(options);
    }
  }
  applyTo2d(_ref) {
    let {
      imageData: {
        data,
        width,
        height
      }
    } = _ref;
    // this code mimic the shader for output consistency
    // it samples 31 pixels across the image over a distance that depends from the blur value.
    this.aspectRatio = width / height;
    this.horizontal = true;
    let blurValue = this.getBlurValue() * width;
    const imageData = new Uint8ClampedArray(data);
    const samples = 15;
    const bytesInRow = 4 * width;
    for (let i = 0; i < data.length; i += 4) {
      let r = 0.0,
        g = 0.0,
        b = 0.0,
        a = 0.0,
        totalA = 0;
      const minIRow = i - i % bytesInRow;
      const maxIRow = minIRow + bytesInRow;
      // for now let's keep noise out of the way
      // let pixelOffset = 0;
      // const offset = Math.random() * 3;
      // if (offset > 2) {
      //   pixelOffset = 4;
      // } else if (offset < 1) {
      //   pixelOffset = -4;
      // }
      for (let j = -15 + 1; j < samples; j++) {
        const percent = j / samples;
        const distance = Math.floor(blurValue * percent) * 4;
        const weight = 1 - Math.abs(percent);
        let sampledPixel = i + distance; // + pixelOffset;
        // try to implement edge mirroring
        if (sampledPixel < minIRow) {
          sampledPixel = minIRow;
        } else if (sampledPixel > maxIRow) {
          sampledPixel = maxIRow;
        }
        const localAlpha = data[sampledPixel + 3] * weight;
        r += data[sampledPixel] * localAlpha;
        g += data[sampledPixel + 1] * localAlpha;
        b += data[sampledPixel + 2] * localAlpha;
        a += localAlpha;
        totalA += weight;
      }
      imageData[i] = r / a;
      imageData[i + 1] = g / a;
      imageData[i + 2] = b / a;
      imageData[i + 3] = a / totalA;
    }
    this.horizontal = false;
    blurValue = this.getBlurValue() * height;
    for (let i = 0; i < imageData.length; i += 4) {
      let r = 0.0,
        g = 0.0,
        b = 0.0,
        a = 0.0,
        totalA = 0;
      const minIRow = i % bytesInRow;
      const maxIRow = imageData.length - bytesInRow + minIRow;
      // for now let's keep noise out of the way
      // let pixelOffset = 0;
      // const offset = Math.random() * 3;
      // if (offset > 2) {
      //   pixelOffset = bytesInRow;
      // } else if (offset < 1) {
      //   pixelOffset = -bytesInRow;
      // }
      for (let j = -15 + 1; j < samples; j++) {
        const percent = j / samples;
        const distance = Math.floor(blurValue * percent) * bytesInRow;
        const weight = 1 - Math.abs(percent);
        let sampledPixel = i + distance; // + pixelOffset;
        // try to implement edge mirroring
        if (sampledPixel < minIRow) {
          sampledPixel = minIRow;
        } else if (sampledPixel > maxIRow) {
          sampledPixel = maxIRow;
        }
        const localAlpha = imageData[sampledPixel + 3] * weight;
        r += imageData[sampledPixel] * localAlpha;
        g += imageData[sampledPixel + 1] * localAlpha;
        b += imageData[sampledPixel + 2] * localAlpha;
        a += localAlpha;
        totalA += weight;
      }
      data[i] = r / a;
      data[i + 1] = g / a;
      data[i + 2] = b / a;
      data[i + 3] = a / totalA;
    }
  }

  /**
   * Send data from this filter to its shader program's uniforms.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context used to compile this filter's shader.
   * @param {Object} uniformLocations A map of string uniform names to WebGLUniformLocation objects
   */
  sendUniformData(gl, uniformLocations) {
    const delta = this.chooseRightDelta();
    gl.uniform2fv(uniformLocations.uDelta, delta);
  }
  isNeutralState() {
    return this.blur === 0;
  }
  getBlurValue() {
    let blurScale = 1;
    const {
      horizontal,
      aspectRatio
    } = this;
    if (horizontal) {
      if (aspectRatio > 1) {
        // image is wide, i want to shrink radius horizontal
        blurScale = 1 / aspectRatio;
      }
    } else {
      if (aspectRatio < 1) {
        // image is tall, i want to shrink radius vertical
        blurScale = aspectRatio;
      }
    }
    return blurScale * this.blur * 0.12;
  }

  /**
   * choose right value of image percentage to blur with
   * @returns {Array} a numeric array with delta values
   */
  chooseRightDelta() {
    const blur = this.getBlurValue();
    return this.horizontal ? [blur, 0] : [0, blur];
  }
}
/**
 * blur value, in percentage of image dimensions.
 * specific to keep the image blur constant at different resolutions
 * range between 0 and 1.
 * @type Number
 * @default
 */
_defineProperty(Blur, "type", 'Blur');
_defineProperty(Blur, "defaults", blurDefaultValues);
_defineProperty(Blur, "uniformLocations", ['uDelta']);
classRegistry.setClass(Blur);

export { Blur, blurDefaultValues };
//# sourceMappingURL=Blur.mjs.map
