import { fireEvent } from './fireEvent.mjs';
import { commonEventInfo } from './util.mjs';

/**
 * Wrap an action handler with firing an event if the action is performed
 * @param {Function} actionHandler the function to wrap
 * @return {Function} a function with an action handler signature
 */
const wrapWithFireEvent = (eventName, actionHandler) => {
  return (eventData, transform, x, y) => {
    const actionPerformed = actionHandler(eventData, transform, x, y);
    if (actionPerformed) {
      fireEvent(eventName, commonEventInfo(eventData, transform, x, y));
    }
    return actionPerformed;
  };
};

export { wrapWithFireEvent };
//# sourceMappingURL=wrapWithFireEvent.mjs.map
