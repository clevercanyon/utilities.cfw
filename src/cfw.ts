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

import { $env, $http, $str, $url } from '@clevercanyon/utilities';
import type * as core from '@cloudflare/workers-types/experimental';

/**
 * Defines types.
 */
export type Context = core.ExecutionContext;

export type Environment = {
	readonly D1?: core.D1Database;
	readonly R2?: core.R2Bucket;
	readonly KV?: core.KVNamespace;
	readonly DO?: core.DurableObjectNamespace;
	readonly __STATIC_CONTENT?: core.KVNamespace;
	readonly [x: string]: unknown;
};
export type Route = (x: FetchEventData) => Promise<core.Response>;

export type Routes = {
	readonly subpathGlobs: {
		readonly [x: string]: Route;
	};
};
export type FetchEventData = {
	readonly request: core.Request;
	readonly env: Environment;
	readonly ctx: Context;
	readonly routes: Routes;
	readonly url: core.URL;
};
export type InitialFetchEventData = {
	readonly request: core.Request;
	readonly env: Environment;
	readonly ctx: Context;
	readonly routes: Routes;
};
export type { core };

/**
 * Handles fetch events.
 *
 * @param   feData Initial fetch event data.
 *
 * @returns        Response promise.
 */
export async function handleFetchEvent(ifeData: InitialFetchEventData): Promise<core.Response> {
	let { request } = ifeData;
	let url: core.URL | null = null;
	const { env, ctx, routes } = ifeData;

	$env.capture('@global', env);

	const basePath = $env.get('@top', 'APP_BASE_PATH', '') as string;

	try {
		request = $http.prepareRequest(request, {}) as core.Request;
		url = $url.parse(request.url) as core.URL;
		//
	} catch (error) {
		if (error instanceof Response) {
			return error as unknown as core.Response;
		}
		return $http.prepareResponse(request, { status: 500 }) as core.Response;
	}
	const feData = { request, env, ctx, routes, url }; // Recompiles data.

	if (
		$http.requestPathIsStatic(request, url) && //
		$env.get('@top', '__STATIC_CONTENT' /* Worker site? */) &&
		$str.matches(url.pathname, basePath + '/assets/**')
	) {
		return handleFetchStaticAssets(feData);
	}
	return handleFetchDynamics(feData);
}

/**
 * Fetches dynamics.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
async function handleFetchDynamics(feData: FetchEventData): Promise<core.Response> {
	const { request, routes, url } = feData;
	const basePath = $env.get('@top', 'APP_BASE_PATH', '') as string;

	for (const [routeSubpathGlob, routeSubpathHandler] of Object.entries(routes.subpathGlobs)) {
		if ($str.matches(url.pathname, basePath + '/' + routeSubpathGlob)) {
			return routeSubpathHandler(feData);
		}
	}
	return $http.prepareResponse(request, { status: 404 }) as core.Response;
}

/**
 * Fetches static assets.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
async function handleFetchStaticAssets(feData: FetchEventData): Promise<core.Response> {
	const { request, ctx } = feData;
	const basePath = $env.get('@top', 'APP_BASE_PATH', '') as string;

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

				const regExp = new RegExp('^' + $str.escRegExp(basePath + '/assets/'), 'u');
				url.pathname = url.pathname.replace(regExp, '/'); // Removes `/assets` prefix.

				return cfKVAꓺmapRequestToAsset(new Request(url, request));
			},
		});
		return $http.prepareResponse(request, { ...response }) as core.Response;
		//
	} catch (error) {
		if (error instanceof cfKVAꓺNotFoundError) {
			return $http.prepareResponse(request, { status: 404 }) as core.Response;
		}
		if (error instanceof cfKVAꓺMethodNotAllowedError) {
			return $http.prepareResponse(request, { status: 405 }) as core.Response;
		}
		return $http.prepareResponse(request, { status: 500 }) as core.Response;
	}
}
