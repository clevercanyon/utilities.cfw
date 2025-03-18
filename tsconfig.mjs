/**
 * TypeScript config file.
 *
 * TypeScript is not aware of this config file's location.
 *
 * The underlying `./tsconfig.json` file can be recompiled using:
 *
 *     $ madrun update tsconfig
 *     or: $ madrun update dotfiles
 *
 * @note CUSTOM EDITS ONLY PLEASE!
 * @note In the future this file will be updated automatically.
 * @note Only `<custom:start.../custom:end>` will be preserved below.
 */

import baseConfig from './dev/.files/configs/typescript/config.mjs';
import { $obj } from './node_modules/@clevercanyon/utilities/dist/index.js';

/*
 * Customizations.
 *
 * Add TypeScript libs and/or types that your project depends on.
 * This file is best suited for `@types/*` packages, while `./ts.types.d.ts`
 * is best when declaring project-specific types that you need globally.
 *
 * <custom:start> */

export default await (async () => {
    return $obj.mergeDeep({}, await baseConfig(), {
        compilerOptions: {
            $concat: {
                lib: ['webworker'],
                types: [],
            },
        },
    });
})();

/* </custom:end> */
