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
 * Routes interface.
 */
export interface Routes {
	readonly subpathGlobs: {
		readonly [x: string]: (x: FetchEventData) => Promise<Response>;
	};
}

/**
 * Initial fetch event data.
 */
interface InitialFetchEventData {
	readonly request: Request;
	readonly env: Environment;
	readonly ctx: ExecutionContext;
	readonly routes: Routes;
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
 * @param   feData Initial fetch event data.
 *
 * @returns        Response promise.
 */
export async function handleFetchEvent(feData: InitialFetchEventData | FetchEventData): Promise<Response> {
	let { request } = feData;
	let url: URL | null = null;
	const { env, ctx, routes } = feData;

	$env.capture(env); // Captures environment vars.
	const basePath = ($env.get('APP_BASE_PATH') as string) || '/';

	try {
		request = $http.prepareRequest(request, {});
		url = $url.parse(request.url, null, true) as URL;
	} catch (error) {
		return error instanceof Response ? error : $http.prepareResponse(request, { status: 500 });
	}
	feData = { request, env, ctx, routes, url }; // Recompiles data.

	if (
		$http.requestPathIsStatic(request, url) &&
		$env.get('__STATIC_CONTENT') && // Worker site?
		$str.matches(url.pathname, basePath + 'assets/**')
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
async function handleFetchDynamics(feData: FetchEventData): Promise<Response> {
	const { request, routes, url } = feData;
	const basePath = ($env.get('APP_BASE_PATH') as string) || '/';

	for (const [routeSubpathGlob, routeSubpathHandler] of Object.entries(routes.subpathGlobs)) {
		if ($str.matches(url.pathname, basePath + routeSubpathGlob)) {
			return routeSubpathHandler(feData);
		}
	}
	return $http.prepareResponse(request, { status: 404 });
}

/**
 * Fetches static assets.
 *
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
async function handleFetchStaticAssets(feData: FetchEventData): Promise<Response> {
	const { request, ctx } = feData;
	const basePath = ($env.get('APP_BASE_PATH') as string) || '/';

	try {
		const eventProps = {
			request: request, // Rewritten below.
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

			mapRequestToAsset: (request: Request): Request => {
				const url = new URL(request.url); // URL is rewritten below.

				const regExp = new RegExp('^' + $str.escRegExp(basePath + 'assets/'), 'u');
				url.pathname = url.pathname.replace(regExp, '/'); // Removes `/assets` prefix.

				return cfKVAꓺmapRequestToAsset(new Request(url, request));
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
