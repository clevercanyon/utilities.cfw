/**
 * `$ madrun` config file.
 *
 * `$ madrun` is aware of this config file's location.
 *
 * @note CUSTOM EDITS ONLY PLEASE!
 * @note In the future this file will be updated automatically.
 * @note Only `<custom:start.../custom:end>` will be preserved below.
 */
/* eslint-env es2021, node */

import baseConfig from './dev/.files/madrun/config.mjs';
import { $obj } from './node_modules/@clevercanyon/utilities/dist/index.js';

/*
 * Customizations.
 * <custom:start> */

export default async (madrun) => {
	return $obj.mergeDeep({}, await baseConfig(madrun), {
		// 'project:[cmd]': '', // Always prefix project CMDs.
	});
};

/* </custom:end> */
