/**
 * Utility class.
 */

import './resources/init-env.js';

import {
	getAssetFromKV as cfKVAꓺgetAssetFromKV,
	mapRequestToAsset as cfKVAꓺmapRequestToAsset,
	MethodNotAllowedError as cfKVAꓺMethodNotAllowedError,
	NotFoundError as cfKVAꓺNotFoundError,
} from '@cloudflare/kv-asset-handler';

import type { $type } from '@clevercanyon/utilities';
import { $env, $http, $str, $url } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type Context = $type.cfw.ExecutionContext;

export type Environment = {
	readonly D1?: $type.cfw.D1Database;
	readonly R2?: $type.cfw.R2Bucket;
	readonly KV?: $type.cfw.KVNamespace;
	readonly DO?: $type.cfw.DurableObjectNamespace;
	readonly __STATIC_CONTENT?: $type.cfw.KVNamespace;
	readonly [x: string]: unknown;
};
export type Route = (x: FetchEventData) => Promise<$type.cfw.Response>;

export type Routes = {
	readonly subpathGlobs: {
		readonly [x: string]: Route;
	};
};
export type FetchEventData = {
	readonly request: $type.cfw.Request;
	readonly env: Environment;
	readonly ctx: Context;
	readonly routes: Routes;
	readonly url: $type.cfw.URL;
};
export type InitialFetchEventData = {
	readonly request: $type.cfw.Request;
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
export const handleFetchEvent = async (ifeData: InitialFetchEventData): Promise<$type.cfw.Response> => {
	let { request } = ifeData;
	const { env, ctx, routes } = ifeData;

	$env.capture('@global', env); // Captures environment vars.
	const appBasePath = String($env.get('@top', 'APP_BASE_PATH', ''));

	try {
		request = $http.prepareRequest(request, {}) as $type.cfw.Request;
		const url = $url.parse(request.url) as $type.cfw.URL;

		const feData = { request, env, ctx, routes, url }; // Recompiles data.
		if (
			$http.requestPathIsStatic(request, url) && //
			$env.get('@top', '__STATIC_CONTENT' /* Worker site? */) &&
			$str.matches(url.pathname, appBasePath + '/assets/**')
		) {
			return handleFetchStaticAssets(feData);
		}
		return handleFetchDynamics(feData);
		//
	} catch (error) {
		if (error instanceof Response) {
			return error as unknown as $type.cfw.Response;
		}
		return $http.prepareResponse(request, { status: 500 }) as $type.cfw.Response;
	}
};

/**
 * Fetches dynamics.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
export const handleFetchDynamics = async (feData: FetchEventData): Promise<$type.cfw.Response> => {
	const { request, routes, url } = feData;
	const appBasePath = String($env.get('@top', 'APP_BASE_PATH', ''));

	for (const [routeSubpathGlob, routeSubpathHandler] of Object.entries(routes.subpathGlobs)) {
		if ($str.matches(url.pathname, appBasePath + '/' + routeSubpathGlob)) {
			return routeSubpathHandler(feData);
		}
	}
	return $http.prepareResponse(request, { status: 404 }) as $type.cfw.Response;
};

/**
 * Fetches static assets.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
async function handleFetchStaticAssets(feData: FetchEventData): Promise<$type.cfw.Response> {
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
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, import/no-unresolved
			ASSET_MANIFEST: JSON.parse(await import('__STATIC_CONTENT_MANIFEST')) as { [x: string]: string },

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
		return $http.prepareResponse(request, { ...response }) as $type.cfw.Response;
		//
	} catch (error) {
		if (error instanceof cfKVAꓺNotFoundError) {
			return $http.prepareResponse(request, { status: 404 }) as $type.cfw.Response;
		}
		if (error instanceof cfKVAꓺMethodNotAllowedError) {
			return $http.prepareResponse(request, { status: 405 }) as $type.cfw.Response;
		}
		return $http.prepareResponse(request, { status: 500 }) as $type.cfw.Response;
	}
}
