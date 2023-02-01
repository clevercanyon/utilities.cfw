/**
 * Vite config file.
 *
 * Vite is aware of this config file's location.
 *
 * @note CUSTOM EDITS ONLY PLEASE!
 * @note In the future this file will be updated automatically.
 * @note Only `<custom:start.../custom:end>` will be preserved below.
 */
/* eslint-env es2021, node */

import { $obj } from '@clevercanyon/utilities';
import baseConfig from './dev/.files/vite/config.mjs';

/*
 * Customizations.
 * <custom:start> */

export default async (vite) => {
	return $obj.mc.merge({}, await baseConfig(vite), {});
};

/* </custom:end> */
