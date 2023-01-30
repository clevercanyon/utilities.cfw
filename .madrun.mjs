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

import mc from 'merge-change';
import baseConfig from './dev/.files/madrun/config.mjs';

/*
 * Customizations.
 * <custom:start> */

export default mc.merge({}, baseConfig, {});

/* </custom:end> */
