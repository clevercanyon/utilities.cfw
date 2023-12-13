/**
 * Initialization.
 */

import { $env } from '@clevercanyon/utilities';

/**
 * Acquires app static defines.
 */
const appPkgName = $$__APP_PKG_NAME__$$;

/**
 * Sets top-level object path.
 */
$env.setTopLevelObp(appPkgName);

/**
 * Captures environment vars.
 */
$env.capture(appPkgName, {
    APP_PKG_NAME: appPkgName,
    ...import.meta.env,
});
