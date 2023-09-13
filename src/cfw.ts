/**
 * Utility class.
 */

import './resources/init-env.ts';

import type { $type } from '@clevercanyon/utilities';
import { $env, $http, $json, $str, $url } from '@clevercanyon/utilities';
import {
	MethodNotAllowedError as cfKVAꓺMethodNotAllowedError,
	NotFoundError as cfKVAꓺNotFoundError,
	getAssetFromKV as cfKVAꓺgetAssetFromKV,
	mapRequestToAsset as cfKVAꓺmapRequestToAsset,
} from '@cloudflare/kv-asset-handler';

const cache = (caches as unknown as $type.cf.CacheStorage).default;

/**
 * Defines types.
 */
export type Context = $type.cf.ExecutionContext;

export type Environment = {
	readonly D1?: $type.cf.D1Database;
	readonly R2?: $type.cf.R2Bucket;
	readonly KV?: $type.cf.KVNamespace;
	readonly DO?: $type.cf.DurableObjectNamespace;
	readonly __STATIC_CONTENT?: $type.cf.KVNamespace;
	readonly [x: string]: unknown;
};
export type Route = (x: FetchEventData) => Promise<$type.cf.Response>;

export type Routes = {
	readonly subpathGlobs: {
		readonly [x: string]: Route;
	};
};
export type FetchEventData = {
	readonly request: $type.cf.Request;
	readonly env: Environment;
	readonly ctx: Context;
	readonly routes: Routes;
	readonly url: $type.cf.URL;
};
export type InitialFetchEventData = {
	readonly request: $type.cf.Request;
	readonly env: Environment;
	readonly ctx: Context;
	readonly routes: Routes;
};

/**
 * Handles fetch events.
 *
 * @param   feData Initial fetch event data.
 *
 * @returns        Response promise.
 */
export const handleFetchEvent = async (ifeData: InitialFetchEventData): Promise<$type.cf.Response> => {
	let { request } = ifeData;
	const { env, ctx, routes } = ifeData;

	$env.capture('@global', env); // Captures environment vars.
	const appBasePath = String($env.get('@top', 'APP_BASE_PATH', ''));

	try {
		request = $http.prepareRequest(request, {}) as $type.cf.Request;
		const url = $url.parse(request.url) as $type.cf.URL;
		const feData = { request, env, ctx, routes, url };
		if (
			$http.requestPathIsStatic(request, url) && //
			$env.get('@top', '__STATIC_CONTENT' /* Worker site? */) &&
			$str.matches(url.pathname, appBasePath + '/assets/**')
		) {
			return handleFetchCache(handleFetchStaticAssets, feData);
		}
		return handleFetchCache(handleFetchDynamics, feData);
		//
	} catch (error) {
		if (error instanceof Response) {
			return error as unknown as $type.cf.Response;
		}
		return $http.prepareResponse(request, { status: 500 }) as $type.cf.Response;
	}
};

/**
 * Handles fetch caching.
 *
 * @param   route  Route handler.
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
export const handleFetchCache = async (route: Route, feData: FetchEventData): Promise<$type.cf.Response> => {
	const { request, ctx } = feData;
	let cachedResponse; // Initialize.

	if (!$http.requestHasCacheableMethod(request)) {
		return route(feData); // Not applicable.
	}
	if ((cachedResponse = await cache.match(request, { ignoreMethod: true }))) {
		if (!$http.requestNeedsContentBody(request, cachedResponse.status)) {
			cachedResponse = new Response(null /* No response body. */, {
				status: cachedResponse.status,
				statusText: cachedResponse.statusText,
				headers: cachedResponse.headers,
			}) as unknown as $type.cf.Response;
		}
		return cachedResponse;
	}
	const response = await route(feData);

	if ('GET' === request.method && 206 !== response.status && '*' !== response.headers.get('vary')) {
		ctx.waitUntil(cache.put(request, response.clone()));
	}
	return response;
};

/**
 * Fetches dynamics.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
export const handleFetchDynamics = async (feData: FetchEventData): Promise<$type.cf.Response> => {
	const { request, routes, url } = feData;
	const appBasePath = String($env.get('@top', 'APP_BASE_PATH', ''));

	for (const [routeSubpathGlob, routeSubpathHandler] of Object.entries(routes.subpathGlobs)) {
		if ($str.matches(url.pathname, appBasePath + '/' + routeSubpathGlob)) {
			return routeSubpathHandler(feData);
		}
	}
	return $http.prepareResponse(request, { status: 404 }) as $type.cf.Response;
};

/**
 * Fetches static assets.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
export const handleFetchStaticAssets = async (feData: FetchEventData): Promise<$type.cf.Response> => {
	const { request, ctx } = feData;
	const appBasePath = String($env.get('@top', 'APP_BASE_PATH', ''));

	try {
		const kvAssetEventData = {
			request: request as unknown as Request,
			waitUntil(promise: Promise<void>): void {
				ctx.waitUntil(promise);
			},
		};
		const response = await cfKVAꓺgetAssetFromKV(kvAssetEventData, {
			ASSET_NAMESPACE: $env.get('@top', '__STATIC_CONTENT') as string,
			// @ts-ignore: This is dynamically resolved by Cloudflare.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- manifest ok.
			ASSET_MANIFEST: $json.parse(await import('__STATIC_CONTENT_MANIFEST')) as { [x: string]: string },

			defaultDocument: 'index.html',
			defaultMimeType: 'application/octet-stream',
			cacheControl: { edgeTTL: 31536000, browserTTL: 31536000 },

			mapRequestToAsset: (request: Request): Request => {
				const url = new URL(request.url); // URL is rewritten below.

				const regExp = new RegExp('^' + $str.escRegExp(appBasePath + '/assets/'), 'u');
				url.pathname = url.pathname.replace(regExp, '/'); // Removes `/assets` prefix.

				return cfKVAꓺmapRequestToAsset(new Request(url, request));
			},
		});
		return $http.prepareResponse(request, { ...response }) as $type.cf.Response;
		//
	} catch (error) {
		if (error instanceof cfKVAꓺNotFoundError) {
			return $http.prepareResponse(request, { status: 404 }) as $type.cf.Response;
		}
		if (error instanceof cfKVAꓺMethodNotAllowedError) {
			return $http.prepareResponse(request, { status: 405 }) as $type.cf.Response;
		}
		return $http.prepareResponse(request, { status: 500 }) as $type.cf.Response;
	}
};
