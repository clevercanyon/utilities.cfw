/**
 * Utility class.
 */

import '#@initialize.ts';

import { $app, $class, $env, $error, $http, $is, $json, $mime, $mm, $obj, $str, $url, $user, type $type } from '@clevercanyon/utilities';
import * as cfKVA from '@cloudflare/kv-asset-handler';

/**
 * Defines types.
 */
export type Context = Readonly<$type.cf.ExecutionContext>;
export type Environment = StdEnvironment &
    Readonly<{
        __STATIC_CONTENT?: $type.cf.KVNamespace;
    }>;
export type Route = (feData: FetchEventData) => Promise<$type.cf.Response>;
export type Routes = Readonly<{ subpathGlobs: { [x: string]: Route } }>;

export type InitialFetchEventData = Readonly<{
    ctx: Context;
    env: Environment;
    request: $type.cf.Request;
    routes: Routes;
}>;
export type FetchEventData = StdFetchEventData &
    Readonly<{
        ctx: Context;
        env: Environment;
        routes: Routes;
    }>;

/**
 * Defines standard types.
 *
 * @note Common across CFW/CFP.
 */
export type StdContext = Readonly<
    Pick<
        $type.cf.ExecutionContext | Parameters<$type.cf.PagesFunction>[0],
        // These are the two required keys.
        'waitUntil' | 'passThroughOnException'
    >
>;
export type StdEnvironment = Readonly<{
    UT?: $type.cf.Fetcher;
    D1?: $type.cf.D1Database;
    R2?: $type.cf.R2Bucket;
    KV?: $type.cf.KVNamespace;
    DO?: $type.cf.DurableObjectNamespace;
}>;
export type StdFetchEventData = Readonly<{
    ctx: StdContext;
    env: StdEnvironment;

    url: $type.cf.URL;
    request: $type.cf.Request;

    auditLogger: $type.LoggerInterface;
    consentLogger: $type.LoggerInterface;
}>;

/**
 * Tracks initialization.
 */
let initialized = false;

/**
 * Defines global base loggers.
 */
let baseAuditLogger: $type.Logger, //
    baseConsentLogger: $type.Logger;

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

    const Logger = $class.getLogger();
    const { ctx, env, request } = ifeData;

    $env.capture('@global', env); // Captures environment variables.

    (baseAuditLogger = new Logger({ endpointToken: $env.get('APP_AUDIT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }) })),
        (baseConsentLogger = new Logger({ endpointToken: $env.get('APP_CONSENT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }) }));

    void baseAuditLogger
        .withContext({ colo: request.cf?.colo || '' }, { cfwContext: ctx, request }) //
        .info('Worker initialized.', { ifeData });
};

/**
 * Handles fetch events.
 *
 * @param   ifeData Initial fetch event data.
 *
 * @returns         Response promise.
 */
export const handleFetchEvent = async (ifeData: InitialFetchEventData): Promise<$type.cf.Response> => {
    const { ctx, env, routes } = ifeData;
    let { request } = ifeData; // Rewritable.

    await maybeInitialize(ifeData); // Initializes worker.

    // Initializes audit logger early so it’s available for any errors below.
    // However, `request` is potentially rewritten, so reinitialize if it changes.
    let auditLogger = baseAuditLogger.withContext({}, { cfwContext: ctx, request });

    try {
        let originalRequest = request; // Potentially rewritten.
        request = $http.prepareRequest(request, {}) as $type.cf.Request;

        if (request !== originalRequest /* Reinitializes using rewritten request. */) {
            auditLogger = baseAuditLogger.withContext({}, { cfwContext: ctx, request });
        }
        const url = $url.parse(request.url) as $type.cf.URL,
            consentLogger = baseConsentLogger.withContext({}, { cfwContext: ctx, request }),
            feData = $obj.freeze({ ctx, env, routes, url, request, auditLogger, consentLogger }) as FetchEventData;

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
        if ($is.response(thrown)) {
            void auditLogger.info(String(thrown.status) + ': Response thrown.', { thrown });
            return thrown as unknown as $type.cf.Response;
        }
        const message = $error.safeMessageFrom(thrown, { default: '9eMw8Ave' });
        void auditLogger.error('500: ' + message, { thrown });

        return $http.prepareResponse(request, {
            status: 500, // Failed status in this scenario.
            headers: { 'content-type': $mime.contentType('.txt') },
            body: message, // Safe message from whatever was thrown.
        }) as $type.cf.Response;
    }
};

// ---
// Misc exports.

/**
 * Easy access to `hop-gdn-utilities` worker.
 *
 * @returns Service binding; {@see StdEnvironment['UT']}.
 */
export const utilities = (): $type.cf.Fetcher => $env.get('UT', { require: true }) as $type.cf.Fetcher;

/**
 * Creates a service binding request.
 *
 * @param   feData      Fetch event data; {@see StdFetchEventData}.
 * @param   requestInfo New request info; {@see $type.cf.RequestInfo}.
 * @param   requestInit New request init; {@see $type.cf.RequestInit}.
 *
 * @returns             Promise of a {@see $type.cf.Request}.
 */
export const serviceBindingRequest = async (feData: StdFetchEventData, requestInfo: $type.cf.RequestInfo, requestInit?: $type.cf.RequestInit): Promise<$type.cf.Request> => {
    const importantParentRequestInit = {
        headers: { 'cf-connecting-ip': await $user.ip(feData.request) },
        cf: $obj.omit($obj.cloneDeep(await $user.ipGeoData(feData.request)), ['ip']),
    };
    return new Request(
        requestInfo as RequestInfo, // e.g., Service binding URL.
        $obj.mergeDeep(importantParentRequestInit, requestInit) as RequestInit,
    ) as unknown as $type.cf.Request;
};

// ---
// Misc utilities.

/**
 * Handles fetch caching.
 *
 * @param   route  Route handler.
 * @param   feData Fetch event data.
 *
 * @returns        Response promise.
 */
const handleFetchCache = async (route: Route, feData: FetchEventData): Promise<$type.cf.Response> => {
    let key, cachedResponse; // Initialize.
    const { ctx, url, request } = feData;

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
const handleFetchDynamics = async (feData: FetchEventData): Promise<$type.cf.Response> => {
    const { url, request, routes } = feData;

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
const handleFetchStaticAssets = async (feData: FetchEventData): Promise<$type.cf.Response> => {
    const { ctx, request } = feData;

    try {
        const kvAssetEventData = {
            request: request as unknown as Request,
            waitUntil(promise: Promise<void>): void {
                ctx.waitUntil(promise);
            },
        };
        const response = await cfKVA.getAssetFromKV(kvAssetEventData, {
            ASSET_NAMESPACE: $env.get('__STATIC_CONTENT', { type: 'string', require: true }),
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
