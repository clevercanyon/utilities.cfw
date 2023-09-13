/**
 * Stylelint config file.
 *
 * Stylelint is aware of this config file's location.
 *
 * @note CUSTOM EDITS ONLY PLEASE!
 * @note In the future this file will be updated automatically.
 * @note Only `<custom:start.../custom:end>` will be preserved below.
 */

import baseConfig from './dev/.files/stylelint/config.mjs';
import { $obj } from './node_modules/@clevercanyon/utilities/dist/index.js';

/*
 * Customizations.
 * <custom:start> */

export default await (async () => {
	return $obj.mergeDeep({}, await baseConfig(), {});
})();

/* </custom:end> */
