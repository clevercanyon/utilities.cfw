/**
 * Utility class.
 */

import '#@initialize.ts';

import { $app, $env, $error, $http, $json, $mime, $mm, $str, $url, type $type } from '@clevercanyon/utilities';
import * as cfKVA from '@cloudflare/kv-asset-handler';
import { Logtail } from '@logtail/edge';

/**
 * Defines types.
 */
export type Context = $type.cf.ExecutionContext;
export type Logger = ReturnType<Logtail['withExecutionContext']>;

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
    auditLogger: Logger;
    consentLogger: Logger;
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
 * Defines global base loggers.
 */
let baseAuditLogger: Logtail, baseConsentLogger: Logtail;

/**
 * Defines global cache to use for HTTP requests.
 */
const cache = (caches as unknown as $type.cf.CacheStorage).default;

/**
 * Initializes worker globals.
 *
 * @param   ifeData Initial fetch event data.
 *
 * @returns         Void promise.
 */
const maybeInitialize = async (ifeData: InitialFetchEventData): Promise<void> => {
    if (initialized) return;
    initialized = true;

    const { env } = ifeData;
    $env.capture('@global', env);

    const auditLoggerSource = $env.get('APP_AUDIT_LOGGER_SOURCE', { type: 'string', require: true }),
        consentLoggerSource = $env.get('APP_CONSENT_LOGGER_SOURCE', { type: 'string', require: true });

    (baseAuditLogger = new Logtail(auditLoggerSource, { contextObjectMaxDepthWarn: false, contextObjectCircularRefWarn: false })),
        (baseConsentLogger = new Logtail(consentLoggerSource, { contextObjectMaxDepthWarn: false, contextObjectCircularRefWarn: false }));
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

    await maybeInitialize(ifeData); // Initializes worker.
    const auditLogger = baseAuditLogger.withExecutionContext(ifeData.ctx),
        consentLogger = baseConsentLogger.withExecutionContext(ifeData.ctx);

    try {
        request = $http.prepareRequest(request, {}) as $type.cf.Request;
        const url = $url.parse(request.url) as $type.cf.URL;
        const feData = { request, env, ctx, routes, url, auditLogger, consentLogger };

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
            void auditLogger.info(String(thrown.status) + ': Response thrown.', { request, thrownResponse: thrown });
            return thrown as unknown as $type.cf.Response;
        }
        const message = $error.safeMessageFrom(thrown, { default: '9eMw8Ave' });
        void auditLogger.warn('500: ' + message, { request, thrown });

        return $http.prepareResponse(request, {
            status: 500, // Failed status in this scenario.
            headers: { 'content-type': $mime.contentType('.txt') },
            body: message, // Safe message from whatever was thrown.
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
    let key, cachedResponse; // Initialize.
    const { request, ctx, url } = feData;

    // Populates cache key.

    key = 'v=' + $app.buildTime().unix().toString();
    if (request.headers.has('origin') /* Possibly empty. */) {
        key += '&origin=' + (request.headers.get('origin') || '');
    }
    const keyURL = $url.removeCSOQueryVars(url); // e.g., `ut[mx]_`, `_ck`, etc.
    keyURL.searchParams.set('_ck', key), keyURL.searchParams.sort(); // Optimizes cache.
    const keyRequest = new Request(keyURL.toString(), request as unknown as Request) as unknown as $type.cf.Request;

    // Checks if request is cacheable.

    if (!['HEAD', 'GET'].includes(keyRequest.method) || !$http.requestHasCacheableMethod(keyRequest)) {
        return route(feData); // Not cacheable; use async route.
    }
    // Reads response for this request from HTTP cache.

    if ((cachedResponse = await cache.match(keyRequest, { ignoreMethod: true }))) {
        if (!$http.requestNeedsContentBody(keyRequest, cachedResponse.status)) {
            cachedResponse = new Response(null, cachedResponse) as unknown as $type.cf.Response;
        }
        return cachedResponse;
    }
    // Routes request and writes response to HTTP cache.

    const response = await route(feData); // Awaits response so we can cache.

    if ('GET' === keyRequest.method && 206 !== response.status && '*' !== response.headers.get('vary') && !response.webSocket) {
        if ($env.isCFWViaMiniflare() && 'no-store' === response.headers.get('cdn-cache-control')) {
            // Miniflare doesn’t currently support `cdn-cache-control`, so we implement basic support for it here.
            response.headers.set('cf-cache-status', 'c10n.miniflare.cdn-cache-control.BYPASS');
        } else {
            // Cloudflare will not actually cache if response headers say not to cache.
            // For further details regarding `cache.put()`; {@see https://o5p.me/gMv7W2}.
            ctx.waitUntil(cache.put(keyRequest, response.clone()));
        }
    }
    return response; // Potentially cached async.
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
        return handleFetchStaticAssets(feData);
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
