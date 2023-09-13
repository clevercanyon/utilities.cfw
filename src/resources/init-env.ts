/**
 * Environment vars.
 */

import { capture as $envꓺcapture, setTopLevelObp as $envꓺsetTopLevelObp } from '@clevercanyon/utilities/env';

/**
 * Acquires app package name.
 */
const appPkgName = $$__APP_PKG_NAME__$$;

/**
 * Sets top-level object path.
 */
$envꓺsetTopLevelObp(appPkgName);

/**
 * Captures environment vars.
 */
$envꓺcapture(appPkgName, import.meta.env);
