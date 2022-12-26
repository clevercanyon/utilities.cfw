/**
 * Utility class.
 */

import {
	getAssetFromKV as cfKVAꓺgetAssetFromKV,
	mapRequestToAsset as cfKVAꓺmapRequestToAsset,
	MethodNotAllowedError as cfKVAꓺMethodNotAllowedError,
	NotFoundError as cfKVAꓺNotFoundError,
} from '@cloudflare/kv-asset-handler';

import { $env, $http, $str, $url } from '@clevercanyon/utilities';

/**
 * Environment.
 */
export interface Environment {
	readonly R2?: R2Bucket;
	readonly KV?: KVNamespace;
	readonly DO?: DurableObjectNamespace;
	readonly __STATIC_CONTENT?: KVNamespace;
	readonly [x: string]: unknown;
}

/**
 * Initial fetch event data.
 */
interface InitialFetchEventData {
	readonly request: Request;
	readonly env: Environment;
	readonly ctx: ExecutionContext;
	readonly routes: {
		basePath: string;
		subPaths: {
			[x: string]: (x: FetchEventData) => Promise<Response>;
		};
	};
}

/**
 * Fetch event data.
 */
export interface FetchEventData extends InitialFetchEventData {
	readonly url: URL;
}

/**
 * Handles fetch events.
 *
 * @param   fed Fetch event data.
 *
 * @returns     Response promise.
 */
export async function handleFetchEvent(fed: FetchEventData | InitialFetchEventData): Promise<Response> {
	$env.captureVars(fed.env); // Captures env vars.

	const url = $url.parse(fed.request.url);

	if (!url) {
		return $http.prepareResponse(fed.request, { status: 400 });
	}
	fed = { ...fed, url, request: $http.prepareRequest(fed.request) };

	if ($http.requestPathIsInvalid(fed.request, fed.url)) {
		return $http.prepareResponse(fed.request, { status: 400 });
	}
	if ($http.requestPathIsForbidden(fed.request, fed.url)) {
		return $http.prepareResponse(fed.request, { status: 403 });
	}
	if (!$http.requestHasSupportedMethod(fed.request)) {
		return $http.prepareResponse(fed.request, { status: 405 });
	}
	if (
		$env.getVar('__STATIC_CONTENT') && // Worker site?
		$http.requestPathHasStaticExtension(fed.request, fed.url) &&
		$str.matches(fed.url.pathname, fed.routes.basePath + 'assets/**') &&
		!$str.matches(fed.url.pathname, fed.routes.basePath + 'assets/a16s/**')
	) {
		return handleFetchPublicStaticAssets(fed);
	}
	return handleFetchDynamics(fed);
}

/**
 * Handles fetching of dynamics.
 *
 * @param   fed Fetch event data.
 *
 * @returns     Response promise.
 */
async function handleFetchDynamics(fed: FetchEventData): Promise<Response> {
	for (const [routePattern, routeHandler] of Object.entries(fed.routes.subPaths)) {
		if ($str.matches(fed.url.pathname, fed.routes.basePath + routePattern)) {
			return routeHandler(fed);
		}
	}
	return $http.prepareResponse(fed.request, { status: 404 });
}

/**
 * Handles fetching of public static assets.
 *
 * @param   fed Fetch event data.
 *
 * @returns     Response promise.
 */
async function handleFetchPublicStaticAssets(fed: FetchEventData): Promise<Response> {
	try {
		const eventProps = {
			request: fed.request,
			waitUntil(promise: Promise<void>) {
				return fed.ctx.waitUntil(promise);
			},
		};
		const response = await cfKVAꓺgetAssetFromKV(eventProps, {
			ASSET_NAMESPACE: $env.getVar('__STATIC_CONTENT'),
			// @ts-ignore: This is dynamically resolved by Cloudflare.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, import/no-unresolved
			ASSET_MANIFEST: JSON.parse(await import('__STATIC_CONTENT_MANIFEST')) as { [x: string]: string },

			defaultDocument: 'index.html',
			defaultMimeType: 'application/octet-stream',
			cacheControl: { edgeTTL: 31536000, browserTTL: 31536000 },

			mapRequestToAsset: (request: Request): Request => {
				const url = new URL(fed.url); // We're rewriting URL for asset mapping.
				const regexp = new RegExp('^' + $str.escRegExp(fed.routes.basePath + 'assets/'), 'u');

				url.pathname = url.pathname.replace(regexp, '/');
				return cfKVAꓺmapRequestToAsset(new Request(url, request));
			},
		});
		return $http.prepareResponse(fed.request, {
			response: new Response(response.body, response),
		});
	} catch (error) {
		if (error instanceof cfKVAꓺNotFoundError) {
			return $http.prepareResponse(fed.request, { status: 404 });
		}
		if (error instanceof cfKVAꓺMethodNotAllowedError) {
			return $http.prepareResponse(fed.request, { status: 405 });
		}
		return $http.prepareResponse(fed.request, { status: 500 });
	}
}
