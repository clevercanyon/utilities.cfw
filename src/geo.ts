/**
 * Utility class.
 */

import './resources/init-env.js';

import type { core as $cfwꓺcore, FetchEventData as $cfwꓺFetchEventData } from './cfw.js';

/**
 * Gets geo property.
 *
 * @param   fed Fetch event data.
 *
 * @returns     Geo property value.
 */
export const prop = (fed: $cfwꓺFetchEventData, prop: string): string => {
	const { request } = fed; // Request extraction.
	const r = request as unknown as $cfwꓺcore.Request; // Includes `cf` property.
	return String(r.cf && prop in r.cf ? r.cf[prop as keyof typeof r.cf] || '' : '');
};
