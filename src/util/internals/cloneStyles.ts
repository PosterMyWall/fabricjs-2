import type { TextStyle } from '../../shapes/Text/StyledText';
import { cloneDeepPlainValue } from './deepPlainValues';

export const cloneStyles = (style: TextStyle): TextStyle => {
  const newObj: TextStyle = {};
  Object.keys(style).forEach((key) => {
    newObj[key] = {};
    Object.keys(style[key]).forEach((keyInner) => {
      // *PMW* deep instead of shallow: nested declaration values
      // (`pmwRunStyles`) must not be shared by reference between copies
      newObj[key][keyInner] = cloneDeepPlainValue(style[key][keyInner]);
    });
  });
  return newObj;
};
