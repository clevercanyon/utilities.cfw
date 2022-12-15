/**
 * Utility class.
 */

import { $HTTP, $Str, $URL } from '@clevercanyon/utilities';
import {
	getAssetFromKV as cfKVAGetAssetFromKV,
	mapRequestToAsset as cfKVAMapRequestToAsset,
	MethodNotAllowedError as CFKVAMethodNotAllowedError,
	NotFoundError as CFKVANotFoundError,
} from '@cloudflare/kv-asset-handler';

/**
 * Environment.
 */
export interface CFWEnvironment {
	readonly R2?: R2Bucket;
	readonly KV?: KVNamespace;
	readonly DO?: DurableObjectNamespace;
	readonly __STATIC_CONTENT?: KVNamespace;
}

/**
 * HTTP fetch data.
 */
interface CFWInitialFetchData {
	readonly request: Request;
	readonly env: CFWEnvironment;
	readonly ctx: ExecutionContext;
	readonly routes: {
		basePath: string;
		subPaths: {
			[x: string]: (x: CFWFetchData) => Promise<Response>;
		};
	};
}
export interface CFWFetchData extends CFWInitialFetchData {
	readonly url: URL;
}

/**
 * Cloudflare worker.
 */
export default class CFW {
	/**
	 * Handles fetch.
	 *
	 * @param   fd Fetch data.
	 *
	 * @returns    Response promise.
	 */
	public static async handleFetch(fd: CFWFetchData | CFWInitialFetchData): Promise<Response> {
		const url = $URL.parse(fd.request.url);

		if (!url) {
			return $HTTP.prepareResponse(fd.request, { status: 400 });
		}
		fd = { ...fd, url, request: $HTTP.prepareRequest(fd.request) };

		if ($HTTP.requestPathIsInvalid(fd.request, fd.url)) {
			return $HTTP.prepareResponse(fd.request, { status: 400 });
		}
		if ($HTTP.requestPathIsForbidden(fd.request, fd.url)) {
			return $HTTP.prepareResponse(fd.request, { status: 403 });
		}
		if (!$HTTP.requestMethodSupported(fd.request)) {
			return $HTTP.prepareResponse(fd.request, { status: 405 });
		}
		if (
			fd.env.__STATIC_CONTENT && // Worker site?
			$HTTP.requestPathHasStaticExtension(fd.request, fd.url) &&
			$Str.matches(fd.url.pathname, fd.routes.basePath + 'assets/**') &&
			!$Str.matches(fd.url.pathname, fd.routes.basePath + 'assets/a16s/**')
		) {
			return CFW.handlePublicStaticAssets(fd);
		}
		return CFW.handleDynamics(fd);
	}

	/**
	 * Handles public static assets.
	 *
	 * @param   fd Fetch data.
	 *
	 * @returns    Response promise.
	 */
	protected static async handlePublicStaticAssets(fd: CFWFetchData): Promise<Response> {
		try {
			const eventProps = {
				request: fd.request,
				waitUntil(promise: Promise<void>) {
					return fd.ctx.waitUntil(promise);
				},
			};
			const response = await cfKVAGetAssetFromKV(eventProps, {
				ASSET_NAMESPACE: fd.env.__STATIC_CONTENT,
				// @ts-ignore: This is dynamically resolved by Cloudflare.
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, import/no-unresolved
				ASSET_MANIFEST: JSON.parse(await import('__STATIC_CONTENT_MANIFEST')) as { [x: string]: string },

				defaultDocument: 'index.html',
				defaultMimeType: 'application/octet-stream',
				cacheControl: { edgeTTL: 31536000, browserTTL: 31536000 },

				mapRequestToAsset: (request: Request): Request => {
					const url = new URL(fd.url); // We're rewriting URL for asset mapping.
					const regexp = new RegExp('^' + $Str.escRegExp(fd.routes.basePath + 'assets/'), 'u');

					url.pathname = url.pathname.replace(regexp, '/');
					return cfKVAMapRequestToAsset(new Request(url, request));
				},
			});
			return $HTTP.prepareResponse(fd.request, {
				response: new Response(response.body, response),
			});
		} catch (error) {
			if (error instanceof CFKVANotFoundError) {
				return $HTTP.prepareResponse(fd.request, { status: 404 });
			}
			if (error instanceof CFKVAMethodNotAllowedError) {
				return $HTTP.prepareResponse(fd.request, { status: 405 });
			}
			return $HTTP.prepareResponse(fd.request, { status: 500 });
		}
	}

	/**
	 * Handles dynamics.
	 *
	 * @param   fd Fetch data.
	 *
	 * @returns    Response promise.
	 */
	protected static async handleDynamics(fd: CFWFetchData): Promise<Response> {
		for (const [routePattern, routeHandler] of Object.entries(fd.routes.subPaths)) {
			if ($Str.matches(fd.url.pathname, fd.routes.basePath + routePattern)) {
				return routeHandler(fd);
			}
		}
		return $HTTP.prepareResponse(fd.request, { status: 404 });
	}

	/**
	 * Gets geo property.
	 *
	 * @param   fd Fetch data.
	 *
	 * @returns    Geo property value.
	 */
	public static geoProp(fd: CFWFetchData, prop: string): string {
		const { request: r } = fd; // Request extraction.
		return String(r.cf && prop in r.cf ? r.cf[prop as keyof typeof r.cf] || '' : '');
	}
}
