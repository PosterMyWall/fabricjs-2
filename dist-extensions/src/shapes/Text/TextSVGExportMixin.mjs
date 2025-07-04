import { config } from '../../config.mjs';
import { escapeXml } from '../../util/lang_string.mjs';
import { colorPropToSVG, createSVGRect } from '../../util/misc/svgParsing.mjs';
import { hasStyleChanged } from '../../util/misc/textStyles.mjs';
import { toFixed } from '../../util/misc/toFixed.mjs';
import { FabricObjectSVGExportMixin } from '../Object/FabricObjectSVGExportMixin.mjs';
import { JUSTIFY } from './constants.mjs';
import { STROKE, FILL } from '../../constants.mjs';
import { createRotateMatrix } from '../../util/misc/matrix.mjs';
import { radiansToDegrees } from '../../util/misc/radiansDegreesConversion.mjs';
import { Point } from '../../Point.mjs';
import { matrixToSVG } from '../../util/misc/svgExport.mjs';

const multipleSpacesRegex = /  +/g;
const dblQuoteRegex = /"/g;
function createSVGInlineRect(color, left, top, width, height) {
  return `\t\t${createSVGRect(color, {
    left,
    top,
    width,
    height
  })}\n`;
}
class TextSVGExportMixin extends FabricObjectSVGExportMixin {
  _toSVG() {
    const offsets = this._getSVGLeftTopOffsets(),
      textAndBg = this._getSVGTextAndBg(offsets.textTop, offsets.textLeft);
    return this._wrapSVGTextAndBg(textAndBg);
  }
  toSVG(reviver) {
    const textSvg = this._createBaseSVGMarkup(this._toSVG(), {
        reviver,
        noStyle: true,
        withShadow: true
      }),
      path = this.path;
    if (path) {
      return textSvg + path._createBaseSVGMarkup(path._toSVG(), {
        reviver,
        withShadow: true,
        additionalTransform: matrixToSVG(this.calcOwnMatrix())
      });
    }
    return textSvg;
  }
  _getSVGLeftTopOffsets() {
    return {
      textLeft: -this.width / 2,
      textTop: -this.height / 2,
      lineTop: this.getHeightOfLine(0)
    };
  }
  _wrapSVGTextAndBg(_ref) {
    let {
      textBgRects,
      textSpans
    } = _ref;
    const noShadow = true,
      textDecoration = this.getSvgTextDecoration(this);
    return [textBgRects.join(''), '\t\t<text xml:space="preserve" ', `font-family="${this.fontFamily.replace(dblQuoteRegex, "'")}" `, `font-size="${this.fontSize}" `, this.fontStyle ? `font-style="${this.fontStyle}" ` : '', this.fontWeight ? `font-weight="${this.fontWeight}" ` : '', textDecoration ? `text-decoration="${textDecoration}" ` : '', this.direction === 'rtl' ? `direction="${this.direction}" ` : '', 'style="', this.getSvgStyles(noShadow), '"', this.addPaintOrder(), ' >', textSpans.join(''), '</text>\n'];
  }

  /**
   * @private
   * @param {Number} textTopOffset Text top offset
   * @param {Number} textLeftOffset Text left offset
   * @return {Object}
   */
  _getSVGTextAndBg(textTopOffset, textLeftOffset) {
    const textSpans = [],
      textBgRects = [];
    let height = textTopOffset,
      lineOffset;

    // bounding-box background
    this.backgroundColor && textBgRects.push(...createSVGInlineRect(this.backgroundColor, -this.width / 2, -this.height / 2, this.width, this.height));

    // text and text-background
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      lineOffset = this._getLineLeftOffset(i);
      if (this.direction === 'rtl') {
        lineOffset += this.width;
      }
      if (this.textBackgroundColor || this.styleHas('textBackgroundColor', i)) {
        this._setSVGTextLineBg(textBgRects, i, textLeftOffset + lineOffset, height);
      }
      this._setSVGTextLineText(textSpans, i, textLeftOffset + lineOffset, height);
      height += this.getHeightOfLine(i);
    }
    return {
      textSpans,
      textBgRects
    };
  }
  _createTextCharSpan(char, styleDecl, left, top, charBox) {
    const numFractionDigit = config.NUM_FRACTION_DIGITS;
    const styleProps = this.getSvgSpanStyles(styleDecl, char !== char.trim() || !!char.match(multipleSpacesRegex)),
      fillStyles = styleProps ? `style="${styleProps}"` : '',
      dy = styleDecl.deltaY,
      dySpan = dy ? ` dy="${toFixed(dy, numFractionDigit)}" ` : '',
      {
        angle,
        renderLeft,
        renderTop,
        width
      } = charBox;
    let angleAttr = '';
    if (renderLeft !== undefined) {
      const wBy2 = width / 2;
      angle && (angleAttr = ` rotate="${toFixed(radiansToDegrees(angle), numFractionDigit)}"`);
      const m = createRotateMatrix({
        angle: radiansToDegrees(angle)
      });
      m[4] = renderLeft;
      m[5] = renderTop;
      const renderPoint = new Point(-wBy2, 0).transform(m);
      left = renderPoint.x;
      top = renderPoint.y;
    }
    return `<tspan x="${toFixed(left, numFractionDigit)}" y="${toFixed(top, numFractionDigit)}" ${dySpan}${angleAttr}${fillStyles}>${escapeXml(char)}</tspan>`;
  }
  _setSVGTextLineText(textSpans, lineIndex, textLeftOffset, textTopOffset) {
    const lineHeight = this.getHeightOfLine(lineIndex),
      isJustify = this.textAlign.includes(JUSTIFY),
      line = this._textLines[lineIndex];
    let actualStyle,
      nextStyle,
      charsToRender = '',
      charBox,
      style,
      boxWidth = 0,
      timeToRender;
    textTopOffset += lineHeight * (1 - this._fontSizeFraction) / this.lineHeight;
    for (let i = 0, len = line.length - 1; i <= len; i++) {
      timeToRender = i === len || this.charSpacing || this.path;
      charsToRender += line[i];
      charBox = this.__charBounds[lineIndex][i];
      if (boxWidth === 0) {
        textLeftOffset += charBox.kernedWidth - charBox.width;
        boxWidth += charBox.width;
      } else {
        boxWidth += charBox.kernedWidth;
      }
      if (isJustify && !timeToRender) {
        if (this._reSpaceAndTab.test(line[i])) {
          timeToRender = true;
        }
      }
      if (!timeToRender) {
        // if we have charSpacing or a path, we render char by char
        actualStyle = actualStyle || this.getCompleteStyleDeclaration(lineIndex, i);
        nextStyle = this.getCompleteStyleDeclaration(lineIndex, i + 1);
        timeToRender = hasStyleChanged(actualStyle, nextStyle, true);
      }
      if (timeToRender) {
        style = this._getStyleDeclaration(lineIndex, i);
        textSpans.push(this._createTextCharSpan(charsToRender, style, textLeftOffset, textTopOffset, charBox));
        charsToRender = '';
        actualStyle = nextStyle;
        if (this.direction === 'rtl') {
          textLeftOffset -= boxWidth;
        } else {
          textLeftOffset += boxWidth;
        }
        boxWidth = 0;
      }
    }
  }
  _setSVGTextLineBg(textBgRects, i, leftOffset, textTopOffset) {
    const line = this._textLines[i],
      heightOfLine = this.getHeightOfLine(i) / this.lineHeight;
    let boxWidth = 0,
      boxStart = 0,
      currentColor,
      lastColor = this.getValueOfPropertyAt(i, 0, 'textBackgroundColor');
    for (let j = 0; j < line.length; j++) {
      const {
        left,
        width,
        kernedWidth
      } = this.__charBounds[i][j];
      currentColor = this.getValueOfPropertyAt(i, j, 'textBackgroundColor');
      if (currentColor !== lastColor) {
        lastColor && textBgRects.push(...createSVGInlineRect(lastColor, leftOffset + boxStart, textTopOffset, boxWidth, heightOfLine));
        boxStart = left;
        boxWidth = width;
        lastColor = currentColor;
      } else {
        boxWidth += kernedWidth;
      }
    }
    currentColor && textBgRects.push(...createSVGInlineRect(lastColor, leftOffset + boxStart, textTopOffset, boxWidth, heightOfLine));
  }

  /**
   * Returns styles-string for svg-export
   * @param {Boolean} skipShadow a boolean to skip shadow filter output
   * @return {String}
   */
  getSvgStyles(skipShadow) {
    return `${super.getSvgStyles(skipShadow)} text-decoration-thickness: ${toFixed(this.textDecorationThickness * this.getObjectScaling().y / 10, config.NUM_FRACTION_DIGITS)}%; white-space: pre;`;
  }

  /**
   * Returns styles-string for svg-export
   * @param {Object} style the object from which to retrieve style properties
   * @param {Boolean} useWhiteSpace a boolean to include an additional attribute in the style.
   * @return {String}
   */
  getSvgSpanStyles(style, useWhiteSpace) {
    const {
      fontFamily,
      strokeWidth,
      stroke,
      fill,
      fontSize,
      fontStyle,
      fontWeight,
      deltaY,
      textDecorationThickness,
      linethrough,
      overline,
      underline
    } = style;
    const textDecoration = this.getSvgTextDecoration({
      underline: underline !== null && underline !== void 0 ? underline : this.underline,
      overline: overline !== null && overline !== void 0 ? overline : this.overline,
      linethrough: linethrough !== null && linethrough !== void 0 ? linethrough : this.linethrough
    });
    const thickness = textDecorationThickness || this.textDecorationThickness;
    return [stroke ? colorPropToSVG(STROKE, stroke) : '', strokeWidth ? `stroke-width: ${strokeWidth}; ` : '', fontFamily ? `font-family: ${!fontFamily.includes("'") && !fontFamily.includes('"') ? `'${fontFamily}'` : fontFamily}; ` : '', fontSize ? `font-size: ${fontSize}px; ` : '', fontStyle ? `font-style: ${fontStyle}; ` : '', fontWeight ? `font-weight: ${fontWeight}; ` : '', textDecoration ? `text-decoration: ${textDecoration}; text-decoration-thickness: ${toFixed(thickness * this.getObjectScaling().y / 10, config.NUM_FRACTION_DIGITS)}%; ` : '', fill ? colorPropToSVG(FILL, fill) : '', deltaY ? `baseline-shift: ${-deltaY}; ` : '', useWhiteSpace ? 'white-space: pre; ' : ''].join('');
  }

  /**
   * Returns text-decoration property for svg-export
   * @param {Object} style the object from which to retrieve style properties
   * @return {String}
   */
  getSvgTextDecoration(style) {
    return ['overline', 'underline', 'line-through'].filter(decoration => style[decoration.replace('-', '')]).join(' ');
  }
}

export { TextSVGExportMixin };
//# sourceMappingURL=TextSVGExportMixin.mjs.map
