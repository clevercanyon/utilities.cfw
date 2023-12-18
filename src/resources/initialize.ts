/**
 * Initialization.
 */

import { $env } from '@clevercanyon/utilities';

/**
 * Acquires app package name.
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
    APP_PKG_VERSION: $$__APP_PKG_VERSION__$$,
    APP_BUILD_TIME_STAMP: $$__APP_BUILD_TIME_STAMP__$$,
    ...import.meta.env,
});
