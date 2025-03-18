/**
 * VS Code config file.
 *
 * VS Code is not aware of this config file's location.
 *
 * The underlying `./settings.json` file can be recompiled using:
 *
 *     $ madrun update vscode
 *     or: $ madrun update dotfiles
 *
 * @note CUSTOM EDITS ONLY PLEASE!
 * @note In the future this file will be updated automatically.
 * @note Only `<custom:start.../custom:end>` will be preserved below.
 */

import baseConfig from '../dev/.files/configs/vscode/config.mjs';
import { $obj } from '../node_modules/@clevercanyon/utilities/dist/index.js';

/*
 * Customizations.
 * <custom:start> */

export default await (async () => {
    return $obj.mergeDeep({}, await baseConfig(), {});
})();

/* </custom:end> */
