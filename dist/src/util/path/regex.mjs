import { taggedTemplateLiteral as _taggedTemplateLiteral } from '../../../_virtual/_rollupPluginBabelHelpers.mjs';
import { reNum } from '../../parser/constants.mjs';

var _templateObject;

/**
 * p for param
 * using "bad naming" here because it makes the regex much easier to read
 */
const p = "(".concat(reNum, ")");
const reMoveToCommand = "(M) (?:".concat(p, " ").concat(p, " ?)+");
const reLineCommand = "(L) (?:".concat(p, " ").concat(p, " ?)+");
const reHorizontalLineCommand = "(H) (?:".concat(p, " ?)+");
const reVerticalLineCommand = "(V) (?:".concat(p, " ?)+");
const reClosePathCommand = String.raw(_templateObject || (_templateObject = _taggedTemplateLiteral(["(Z)s*"], ["(Z)\\s*"])));
const reCubicCurveCommand = "(C) (?:".concat(p, " ").concat(p, " ").concat(p, " ").concat(p, " ").concat(p, " ").concat(p, " ?)+");
const reCubicCurveShortcutCommand = "(S) (?:".concat(p, " ").concat(p, " ").concat(p, " ").concat(p, " ?)+");
const reQuadraticCurveCommand = "(Q) (?:".concat(p, " ").concat(p, " ").concat(p, " ").concat(p, " ?)+");
const reQuadraticCurveShortcutCommand = "(T) (?:".concat(p, " ").concat(p, " ?)+");
const reArcCommand = "(A) (?:".concat(p, " ").concat(p, " ").concat(p, " ([01]) ?([01]) ").concat(p, " ").concat(p, " ?)+");
const rePathCommand = "(?:(?:".concat(reMoveToCommand, ")") + "|(?:".concat(reLineCommand, ")") + "|(?:".concat(reHorizontalLineCommand, ")") + "|(?:".concat(reVerticalLineCommand, ")") + "|(?:".concat(reClosePathCommand, ")") + "|(?:".concat(reCubicCurveCommand, ")") + "|(?:".concat(reCubicCurveShortcutCommand, ")") + "|(?:".concat(reQuadraticCurveCommand, ")") + "|(?:".concat(reQuadraticCurveShortcutCommand, ")") + "|(?:".concat(reArcCommand, "))");

export { rePathCommand };
//# sourceMappingURL=regex.mjs.map
