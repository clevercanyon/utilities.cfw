/**
 * Utility class.
 */

import type { FetchEventData } from './index.js';

/**
 * Gets geo property.
 *
 * @param   fed Fetch data.
 *
 * @returns     Geo property value.
 */
export function prop(fed: FetchEventData, prop: string): string {
	const { request: r } = fed; // Request extraction.
	return String(r.cf && prop in r.cf ? r.cf[prop as keyof typeof r.cf] || '' : '');
}
