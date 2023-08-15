/**
 * Utility class.
 */

import './resources/init-env.js';

import type {
	FetchEventData, //
	Request as $cfwꓺRequest,
} from './cfw.js';

/**
 * Gets geo property.
 *
 * @param   fed Fetch event data.
 *
 * @returns     Geo property value.
 */
export const prop = (fed: FetchEventData, prop: string): string => {
	const { request } = fed; // Request extraction.
	const r = request as unknown as $cfwꓺRequest; // Cast type.

	return String(r.cf && prop in r.cf ? r.cf[prop as keyof typeof r.cf] || '' : '');
};
