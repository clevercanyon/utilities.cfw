/**
 * Tailwind config file.
 *
 * Tailwind is aware of this config file's location.
 *
 * @note CUSTOM EDITS ONLY PLEASE!
 * @note In the future this file will be updated automatically.
 * @note Only `<custom:start.../custom:end>` will be preserved below.
 */

import baseConfig from './dev/.files/tailwind/config.mjs';
import { $obj } from './node_modules/@clevercanyon/utilities/dist/index.js';

/*
 * Customizations.
 * <custom:start> */

export default /* Note: Tailwind is not async compatible */ (() => {
	return $obj.mergeDeep({}, baseConfig(), {});
})();

/* </custom:end> */
