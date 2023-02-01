/**
 * Prettier config file.
 *
 * Prettier is aware of this config file's location.
 *
 * @note CUSTOM EDITS ONLY PLEASE!
 * @note In the future this file will be updated automatically.
 * @note Only `<custom:start.../custom:end>` will be preserved below.
 */
/* eslint-env es2021, node */

const $obj = require('@clevercanyon/utilities/obj');
const baseConfig = require('./dev/.files/prettier/config.cjs');

/*
 * Customizations.
 * <custom:start> */

module.exports = $obj.mc.merge({}, baseConfig, {});

/* </custom:end> */
