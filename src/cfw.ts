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
		subpathGlobs: {
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
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
export async function handleFetchEvent({ request, env, ctx, routes }: FetchEventData | InitialFetchEventData): Promise<Response> {
	$env.capture(env); // Environment vars.
	const url = $url.parse(request.url);

	if (!url) {
		// Catches unparseable URLs.
		return $http.prepareResponse(request, { status: 400 });
	}
	request = $http.prepareRequest(request);
	const feData = { request, env, ctx, routes, url };

	if ($http.requestPathIsInvalid(request, url)) {
		return $http.prepareResponse(request, { status: 400 });
	}
	if ($http.requestPathIsForbidden(request, url)) {
		return $http.prepareResponse(request, { status: 403 });
	}
	if (!$http.requestHasSupportedMethod(request)) {
		return $http.prepareResponse(request, { status: 405 });
	}
	if (
		$env.get('__STATIC_CONTENT') && // Worker site?
		$http.requestPathHasStaticExtension(request, url) &&
		$str.matches(url.pathname, routes.basePath + 'assets/**') &&
		!$str.matches(url.pathname, routes.basePath + 'assets/a16s/**')
	) {
		return handleFetchPublicStaticAssets(feData);
	}
	return handleFetchDynamics(feData);
}

/**
 * Handles fetching of dynamics.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
async function handleFetchDynamics({ request, env, ctx, routes, url }: FetchEventData): Promise<Response> {
	for (const [routeSubpathGlob, routeSubpathHandler] of Object.entries(routes.subpathGlobs)) {
		if ($str.matches(url.pathname, routes.basePath + routeSubpathGlob)) {
			return routeSubpathHandler({ request, env, ctx, routes, url });
		}
	}
	return $http.prepareResponse(request, { status: 404 });
}

/**
 * Handles fetching of public static assets.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
async function handleFetchPublicStaticAssets({ request, ctx, routes }: FetchEventData): Promise<Response> {
	try {
		const eventProps = {
			request, // For asset handler.
			waitUntil(promise: Promise<void>): void {
				ctx.waitUntil(promise);
			},
		};
		const response = await cfKVAꓺgetAssetFromKV(eventProps, {
			ASSET_NAMESPACE: $env.get('__STATIC_CONTENT'),
			// @ts-ignore: This is dynamically resolved by Cloudflare.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, import/no-unresolved
			ASSET_MANIFEST: JSON.parse(await import('__STATIC_CONTENT_MANIFEST')) as { [x: string]: string },

			defaultDocument: 'index.html',
			defaultMimeType: 'application/octet-stream',
			cacheControl: { edgeTTL: 31536000, browserTTL: 31536000 },

			mapRequestToAsset: (rewriteRequest: Request): Request => {
				const rewriteURL = new URL(rewriteRequest.url); // Rewrites URL for asset mapping.
				const rewriteRegExp = new RegExp('^' + $str.escRegExp(routes.basePath + 'assets/'), 'u');

				rewriteURL.pathname = rewriteURL.pathname.replace(rewriteRegExp, '/');
				return cfKVAꓺmapRequestToAsset(new Request(rewriteURL, rewriteRequest));
			},
		});
		return $http.prepareResponse(request, {
			response: new Response(response.body, response),
		});
	} catch (error) {
		if (error instanceof cfKVAꓺNotFoundError) {
			return $http.prepareResponse(request, { status: 404 });
		}
		if (error instanceof cfKVAꓺMethodNotAllowedError) {
			return $http.prepareResponse(request, { status: 405 });
		}
		return $http.prepareResponse(request, { status: 500 });
	}
}
