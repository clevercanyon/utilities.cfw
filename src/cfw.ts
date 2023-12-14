/**
 * Utility class.
 */

import '#@initialize.ts';

import { $env, $error, $http, $json, $mime, $mm, $str, $url, type $type } from '@clevercanyon/utilities';
import * as cfKVA from '@cloudflare/kv-asset-handler';

/**
 * Defines types.
 */
export type Context = $type.cf.ExecutionContext;

export type Environment = Readonly<{
    D1?: $type.cf.D1Database;
    R2?: $type.cf.R2Bucket;
    KV?: $type.cf.KVNamespace;
    DO?: $type.cf.DurableObjectNamespace;
    __STATIC_CONTENT?: $type.cf.KVNamespace;
    [x: string]: unknown;
}>;
export type Route = (x: FetchEventData) => Promise<$type.cf.Response>;

export type Routes = Readonly<{
    subpathGlobs: Readonly<{
        [x: string]: Route;
    }>;
}>;
export type FetchEventData = Readonly<{
    request: $type.cf.Request;
    env: Environment;
    ctx: Context;
    routes: Routes;
    url: $type.cf.URL;
}>;
export type InitialFetchEventData = Readonly<{
    request: $type.cf.Request;
    env: Environment;
    ctx: Context;
    routes: Routes;
}>;

/**
 * Tracks initialization.
 */
let initialized = false;

/**
 * Defines cache to use for HTTP requests.
 */
const cache = (caches as unknown as $type.cf.CacheStorage).default;

/**
 * Handles worker initialization.
 */
const maybeInitialize = async (ifeData: InitialFetchEventData): Promise<void> => {
    if (initialized) return;
    initialized = true;

    const { env } = ifeData;
    $env.capture('@global', env);
};

/**
 * Handles fetch events.
 *
 * @param   ifeData Initial fetch event data.
 *
 * @returns         Response promise.
 */
export const handleFetchEvent = async (ifeData: InitialFetchEventData): Promise<$type.cf.Response> => {
    let { request } = ifeData;
    const { env, ctx, routes } = ifeData;

    try {
        await maybeInitialize(ifeData);

        request = $http.prepareRequest(request, {}) as $type.cf.Request;
        const url = $url.parse(request.url) as $type.cf.URL;
        const feData = { request, env, ctx, routes, url };

        // This is somewhat in reverse of how we would normally serve requests.
        // Typically, we would first check if it’s potentially dynamic, and then fall back on assets.
        // We still do that, but in the case of a worker site, if it’s in `/assets` it can only be static.
        if (
            $http.requestPathIsStatic(request, url) && //
            $env.get('__STATIC_CONTENT' /* Worker site? */) &&
            $mm.test(url.pathname, $url.pathFromAppBase('./assets/') + '**')
        ) {
            return handleFetchCache(handleFetchStaticAssets, feData);
        }
        return handleFetchCache(handleFetchDynamics, feData);
        //
    } catch (thrown) {
        if (thrown instanceof Response) {
            return thrown as unknown as $type.cf.Response;
        }
        return $http.prepareResponse(request, {
            status: 500,
            headers: { 'content-type': $mime.contentType('.txt') },
            body: $error.safeMessageFrom(thrown, { default: '9eMw8Ave' }),
        }) as $type.cf.Response;
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

    if ('GET' === request.method && 206 !== response.status && '*' !== response.headers.get('vary') && !response.webSocket) {
        if ($env.isCFWViaMiniflare() && 'no-store' === response.headers.get('cdn-cache-control')) {
            // Miniflare doesn’t currently support `cdn-cache-control`, so we implement basic support for it here.
            response.headers.set('cf-cache-status', 'c10n.miniflare.cdn-cache-control.BYPASS');
        } else {
            // Cloudflare will not actually cache if response headers say not to cache.
            // For further details regarding `cache.put()`; {@see https://o5p.me/gMv7W2}.
            ctx.waitUntil(cache.put(request, response.clone()));
        }
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

    for (const [routeSubpathGlob, routeSubpathHandler] of Object.entries(routes.subpathGlobs)) {
        if ($mm.test(url.pathname, $url.pathFromAppBase('./') + routeSubpathGlob)) {
            return routeSubpathHandler(feData);
        }
    }
    // Falls back on static assets, when applicable. Remember, it *might* have been dynamic. We now know it wasn’t.
    // e.g., In the case of {@see $http.requestPathIsStatic()} having returned false above for a potentially-dynamic path.
    if (
        $env.get('__STATIC_CONTENT' /* Worker site? */) && //
        $mm.test(url.pathname, $url.pathFromAppBase('./assets/') + '**')
    ) {
        return handleFetchCache(handleFetchStaticAssets, feData);
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

    try {
        const kvAssetEventData = {
            request: request as unknown as Request,
            waitUntil(promise: Promise<void>): void {
                ctx.waitUntil(promise);
            },
        };
        const response = await cfKVA.getAssetFromKV(kvAssetEventData, {
            ASSET_NAMESPACE: $env.get('__STATIC_CONTENT', { type: 'string' }),
            // @ts-ignore: This is dynamically resolved by Cloudflare.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- manifest ok.
            ASSET_MANIFEST: $json.parse(await import('__STATIC_CONTENT_MANIFEST')) as { [x: string]: string },

            defaultDocument: 'index.html',
            defaultMimeType: 'application/octet-stream',
            cacheControl: { edgeTTL: 31536000, browserTTL: 31536000 },

            mapRequestToAsset: (request: Request): Request => {
                const url = new URL(request.url); // URL is rewritten below.

                const regExp = new RegExp('^' + $str.escRegExp($url.pathFromAppBase('./assets/')), 'u');
                url.pathname = url.pathname.replace(regExp, '/'); // Removes `/assets` prefix.

                return cfKVA.mapRequestToAsset(new Request(url, request));
            },
        });
        return $http.prepareResponse(request, { ...response }) as $type.cf.Response;
        //
    } catch (thrown) {
        if (thrown instanceof cfKVA.NotFoundError) {
            return $http.prepareResponse(request, { status: 404 }) as $type.cf.Response;
        }
        if (thrown instanceof cfKVA.MethodNotAllowedError) {
            return $http.prepareResponse(request, { status: 405 }) as $type.cf.Response;
        }
        throw thrown; // Re-throw, allowing our default error handler to catch.
    }
};
