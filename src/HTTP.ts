/**
 * Utility class.
 */

import { $HTTP, $Str, $URL } from '@clevercanyon/utilities';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

/**
 * HTTP routes.
 */
interface HTTPRoutes {
	[pattern: string]: (r: Request) => Promise<Response>;
}

/**
 * HTTP server utilities.
 */
export default class HTTPs {
	/**
	 * Handles fetch.
	 *
	 * @param event  Event.
	 * @param routes Routes.
	 *
	 * @returns Response promise.
	 */
	public static async handleFetch(event: FetchEvent, routes: HTTPRoutes): Promise<Response> {
		const request = $HTTP.prepareRequest(event.request, {});
		const url = $URL.parse(request.url);

		if (!$HTTP.requestMethodSupported(request)) {
			return $HTTP.prepareResponse(request, { status: 405 });
		}
		if (!url) {
			return $HTTP.prepareResponse(request, { status: 400 });
		}
		if ('__STATIC_CONTENT' in globalThis && $HTTP.requestPathIsStatic(request)) {
			try {
				return HTTPs.handleStatics(url, event, request);
			} catch {}
		}
		return HTTPs.handleDynamics(url, event, request, routes);
	}

	/**
	 * Handles statics.
	 *
	 * @param url   URL.
	 * @param event Event.
	 * @param request Request.
	 *
	 * @returns Response promise.
	 *
	 * @throws Error when static asset is missing.
	 */
	protected static async handleStatics(url: URL, event: FetchEvent, request: Request): Promise<Response> {
		let response = await getAssetFromKV(event, {
			ASSET_NAMESPACE: '__STATIC_CONTENT', // Wrangler default.
			cacheControl: { edgeTTL: 31536000, browserTTL: 31536000 },
		});
		response = new Response(response.body, response);

		return $HTTP.prepareResponse(request, { response });
	}

	/**
	 * Handles dynamics.
	 *
	 * @param url    URL.
	 * @param event  Event.
	 * @param request Request.
	 * @param routes Routes.
	 *
	 * @returns Response promise.
	 */
	protected static async handleDynamics(url: URL, event: FetchEvent, request: Request, routes: HTTPRoutes): Promise<Response> {
		for (const [routePattern, routHandler] of Object.entries(routes)) {
			if ($Str.matches(url.pathname, routePattern)) {
				return routHandler(request);
			}
		}
		return $HTTP.prepareResponse(request, { status: 404 });
	}

	/**
	 * Gets geo property.
	 *
	 * @since 2022-02-26
	 *
	 * @param request Request.
	 *
	 * @returns Geo property value.
	 */
	public static geoProp(request: Request, prop: string): string {
		return String(request.cf && prop in request.cf ? request.cf[prop as keyof typeof request.cf] || '' : '');
	}
}
