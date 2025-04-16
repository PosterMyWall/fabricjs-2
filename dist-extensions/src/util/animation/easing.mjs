import { halfPI } from '../../constants.mjs';

/**
 * Easing functions
 * @see {@link http://gizma.com/easing/ Easing Equations by Robert Penner}
 */


/**
 * Default sinusoidal easing
 */
const defaultEasing = (t, b, c, d) => -c * Math.cos(t / d * halfPI) + c + b;

export { defaultEasing };
//# sourceMappingURL=easing.mjs.map
