import { STROKE, FILL, LEFT, reNewline } from '../../constants.mjs';

const TEXT_DECORATION_THICKNESS = 'textDecorationThickness';
const fontProperties = ['fontSize', 'fontWeight', 'fontFamily', 'fontStyle'];
const textDecorationProperties = ['underline', 'overline', 'linethrough', 'squigglyline'];
const textLayoutProperties = [...fontProperties, 'lineHeight', 'text', 'charSpacing', 'textAlign', 'styles', 'path', 'pathStartOffset', 'pathSide', 'pathAlign'];
const additionalProps = [...textLayoutProperties, ...textDecorationProperties, 'textBackgroundColor', 'direction', TEXT_DECORATION_THICKNESS];
const styleProperties = [...fontProperties, ...textDecorationProperties, STROKE, 'isStrokeForBold', 'strokeWidth', FILL, 'deltaY', 'textBackgroundColor', TEXT_DECORATION_THICKNESS];

// @TODO: Many things here are configuration related and shouldn't be on the class nor prototype
// regexes, list of properties that are not suppose to change by instances, magic consts.
// this will be a separated effort
const textDefaultValues = {
  _reNewline: reNewline,
  _reSpacesAndTabs: /[ \t\r]/g,
  _reSpaceAndTab: /[ \t\r]/,
  _reWords: /\S+/g,
  fontSize: 40,
  fontWeight: 'normal',
  fontFamily: 'Times New Roman',
  underline: false,
  overline: false,
  linethrough: false,
  squigglyline: false,
  ignoreDelegatedSet: false,
  squigglylineColor: '#FF0000',
  isStrokeForBold: false,
  textAlign: LEFT,
  fontStyle: 'normal',
  lineHeight: 1.16,
  textBackgroundColor: '',
  stroke: null,
  shadow: null,
  path: undefined,
  pathStartOffset: 0,
  pathSide: LEFT,
  pathAlign: 'baseline',
  cacheExpansionFactor: 1,
  charSpacing: 0,
  deltaY: 0,
  direction: 'ltr',
  CACHE_FONT_SIZE: 400,
  MIN_TEXT_WIDTH: 2,
  // Text magic numbers
  superscript: {
    size: 0.6,
    // fontSize factor
    baseline: -0.35 // baseline-shift factor (upwards)
  },
  subscript: {
    size: 0.6,
    // fontSize factor
    baseline: 0.11 // baseline-shift factor (downwards)
  },
  _fontSizeFraction: 0.222,
  offsets: {
    underline: 0.1,
    squigglyline: 0.1,
    linethrough: -0.28167,
    // added 1/30 to original number
    overline: -0.81333 // added 1/15 to original number
  },
  _fontSizeMult: 1.13,
  [TEXT_DECORATION_THICKNESS]: 66.667 // before implementation was 1/15
};
const JUSTIFY = 'justify';
const JUSTIFY_LEFT = 'justify-left';
const JUSTIFY_RIGHT = 'justify-right';
const JUSTIFY_CENTER = 'justify-center';

export { JUSTIFY, JUSTIFY_CENTER, JUSTIFY_LEFT, JUSTIFY_RIGHT, TEXT_DECORATION_THICKNESS, additionalProps, styleProperties, textDecorationProperties, textDefaultValues, textLayoutProperties };
//# sourceMappingURL=constants.mjs.map
