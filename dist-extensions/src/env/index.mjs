import { config } from '../config.mjs';
import { getEnv as getEnv$1 } from './browser.mjs';

/**
 * This file is consumed by fabric.
 * The `./node` and `./browser` files define the env variable that is used by this module.
 * The `./browser` module is defined to be the default env and doesn't set the env at all.
 * This is done in order to support isomorphic usage for browser and node applications
 * since window and document aren't defined at time of import in SSR, we can't set env so we avoid it by deferring to the default env.
 */

let env;

/**
 * In order to support SSR we **MUST** access the browser env only after the window has loaded
 */
const getEnv = () => env || (env = getEnv$1());
const getFabricDocument = () => getEnv().document;
const getFabricWindow = () => getEnv().window;

/**
 * @returns the config value if defined, fallbacks to the environment value
 */
const getDevicePixelRatio = () => {
  var _config$devicePixelRa;
  return Math.max((_config$devicePixelRa = config.devicePixelRatio) !== null && _config$devicePixelRa !== void 0 ? _config$devicePixelRa : getFabricWindow().devicePixelRatio, 1);
};

export { getDevicePixelRatio, getEnv, getFabricDocument, getFabricWindow };
//# sourceMappingURL=index.mjs.map
