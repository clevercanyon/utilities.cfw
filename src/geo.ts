/**
 * Utility class.
 */

import '#@initialize.ts';

import { $cfw } from '#index.ts';
import { type $type } from '@clevercanyon/utilities';

/**
 * Gets geo property.
 *
 * @param   fed Fetch event data.
 *
 * @returns     Geo property value.
 */
export const prop = (fed: $cfw.FetchEventData, prop: string): string => {
    const { request } = fed; // Request extraction.
    const r = request as unknown as $type.cf.Request; // Includes `cf` property.
    return String(r.cf && prop in r.cf ? r.cf[prop as keyof typeof r.cf] || '' : '');
};
