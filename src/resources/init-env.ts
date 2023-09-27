/**
 * Environment vars.
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
$env.capture(appPkgName, import.meta.env);
