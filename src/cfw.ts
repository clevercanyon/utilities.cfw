/**
 * Utility class.
 */

import '#@initialize.ts';

import { $app, $class, $env, $error, $fsize, $http, $is, $mime, $mm, $obj, $url, $user, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type Context = Readonly<$type.cf.ExecutionContext>;
export type Environment = StdEnvironment;
export type Route = ((feData: FetchEventData) => Promise<$type.cf.Response>) & {
    config?: Required<$http.RouteConfig>;
};
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
 * Defines common types across CFW/CFP.
 */
export type StdContext = Readonly<
    Pick<
        $type.cf.ExecutionContext | Parameters<$type.cf.PagesFunction>[0],
        // These are the two required keys.
        'waitUntil' | 'passThroughOnException'
    >
>;
export type StdEnvironment = Readonly<{
    UT: $type.cf.Fetcher;
    D1: $type.cf.D1Database;
    R2: $type.cf.R2Bucket;
    KV: $type.cf.KVNamespace;
    DO: $type.cf.DurableObjectNamespace;
}>;
export type StdFetchEventData = Readonly<{
    ctx: StdContext;
    env: StdEnvironment;

    url: $type.cf.URL;
    request: $type.cf.Request;

    auditLogger: $type.LoggerInterface;
    consentLogger: $type.LoggerInterface;

    URL: typeof $type.cf.URL;
    fetch: typeof $type.cf.fetch;
    caches: typeof $type.cf.caches;
    Request: typeof $type.cf.Request;
    Response: typeof $type.cf.Response;
}>;

/**
 * Tracks global init.
 */
let initializedGlobals = false;

/**
 * Initializes worker globals.
 *
 * @param ifeData Initial fetch event data.
 */
const maybeInitializeGlobals = async (ifeData: InitialFetchEventData): Promise<void> => {
    if (initializedGlobals) return;
    initializedGlobals = true;

    $env.capture(
        '@global', // Captures primitive environment variables.
        Object.fromEntries(
            Object.entries(ifeData.env).filter(([, value]): boolean => {
                // Anything that is not a primitive value; e.g., KV, D1, or other bindings,
                // must be accessed in a request-specific way using {@see FetchEventData}.
                return $is.primitive(value);
            }),
        ),
    );
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

    await maybeInitializeGlobals(ifeData); // Initializes worker globals.

    const Logger = $class.getLogger(), // Initializes base audit and consent loggers.
        baseAuditLogger = new Logger({ endpointToken: $env.get('APP_AUDIT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }) }),
        baseConsentLogger = new Logger({ endpointToken: $env.get('APP_CONSENT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }) });

    // Initializes audit logger early so it’s available for any errors below.
    // However, `request` is potentially rewritten, so reinitialize if it changes.
    let auditLogger = baseAuditLogger.withContext({}, { cfwContext: ctx, request });

    try {
        let originalRequest = request; // Potentially rewritten.
        request = (await $http.prepareRequest(request, {})) as $type.cf.Request;

        if (request !== originalRequest /* Reinitializes using rewritten request. */) {
            auditLogger = baseAuditLogger.withContext({}, { cfwContext: ctx, request });
        }
        const url = $url.parse(request.url) as $type.cf.URL,
            consentLogger = baseConsentLogger.withContext({}, { cfwContext: ctx, request }),
            feData = $obj.freeze({
                ctx,
                env,
                routes,

                url,
                request,

                auditLogger,
                consentLogger,

                URL: globalThis.URL as unknown as typeof $type.cf.URL,
                fetch: globalThis.fetch as unknown as typeof $type.cf.fetch,
                caches: globalThis.caches as unknown as typeof $type.cf.caches,
                Request: globalThis.Request as unknown as typeof $type.cf.Request,
                Response: globalThis.Response as unknown as typeof $type.cf.Response,
            });
        for (const [subpathGlob, route] of Object.entries(routes.subpathGlobs))
            if ($mm.test(url.pathname, $url.pathFromAppBase('./') + subpathGlob)) {
                return handleFetchCache(route, feData);
            }
        return $http.prepareResponse(request, { status: 404 }) as Promise<$type.cf.Response>;
        //
    } catch (thrown) {
        if ($is.response(thrown)) {
            return thrown as $type.cf.Response;
        }
        const message = $error.safeMessageFrom(thrown, { default: '9eMw8Ave' });
        void auditLogger.error('500: ' + message, { thrown });

        return $http.prepareResponse(request, {
            status: 500, // Failed status in this scenario.
            headers: { 'content-type': $mime.contentType('.txt') },
            body: message, // Safe message from whatever was thrown.
        }) as Promise<$type.cf.Response>;
    }
};

// ---
// Misc exports.

/**
 * Creates a service binding request.
 *
 * The distinction here is simply that we forward IP address and geolocation data to service bindings. Cloudflare
 * doesn’t do it by default, but our codebases assume IP and geolocation data will be available; i.e., for every
 * request. Therefore, when issuing requests to a service binding, always use this utility to build a request.
 *
 * @param   feData      Fetch event data; {@see StdFetchEventData}.
 * @param   requestInfo New request info; {@see $type.cf.RequestInfo}.
 * @param   requestInit New request init; {@see $type.cf.RequestInit}.
 *
 * @returns             Promise of a {@see $type.cf.Request}.
 */
export const serviceBindingRequest = async (feData: StdFetchEventData, requestInfo: $type.cf.RequestInfo, requestInit?: $type.cf.RequestInit): Promise<$type.cf.Request> => {
    const { Request } = feData;

    const importantParentRequestInit = {
        headers: { 'cf-connecting-ip': await $user.ip(feData.request) },
        cf: $obj.omit($obj.cloneDeep(await $user.ipGeoData(feData.request)), ['ip']),
    };
    return new Request(
        requestInfo, // e.g., Service binding URL.
        $obj.mergeDeep(importantParentRequestInit, requestInit) as $type.cf.RequestInit,
    );
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
    let key, cachedResponse; // Initializes writable vars.
    const { ctx, url, request, caches, Request, auditLogger } = feData;

    // Populates cache key.

    const varyOn = new Set(route.config?.varyOn || []);
    for (const v of varyOn) if (!request.headers.has(v)) varyOn.delete(v);

    if ((!route.config || route.config.enableCORs) && request.headers.has('origin')) {
        varyOn.add('origin'); // CORs requires us to vary on origin.
    } else varyOn.delete('origin'); // Must not vary on origin.

    key = 'v=' + $app.buildTime().toStamp().toString();
    for (const v of varyOn) key += '&' + v + '=' + (request.headers.get(v) || '');

    const keyURL = $url.removeCSOQueryVars(url); // e.g., `ut[mx]_`, `_ck`, etc.
    keyURL.searchParams.set('_ck', key), keyURL.searchParams.sort(); // Optimizes cache.
    const keyRequest = new Request(keyURL.toString(), request);

    // Checks if request is cacheable.

    if (!['HEAD', 'GET'].includes(keyRequest.method) || !$http.requestHasCacheableMethod(keyRequest)) {
        return route(feData); // Not cacheable; use async route.
    }
    // Reads response for this request from HTTP cache.

    if ((cachedResponse = await caches.default.match(keyRequest, { ignoreMethod: true }))) {
        void auditLogger.log('Serving response from cache.', { cachedResponse });
        return $http.prepareCachedResponse(keyRequest, cachedResponse) as Promise<$type.cf.Response>;
    }
    // Routes request and writes response to HTTP cache.

    const response = await route(feData); // Awaits response so we can cache.
    if (
        !response.webSocket &&
        206 !== response.status &&
        'GET' === keyRequest.method &&
        '*' !== response.headers.get('vary') &&
        'no-store' !== response.headers.get('cdn-cache-control') &&
        // We have 128M of memory to work with. So let’s not go over that limit when caching.
        // Cloudflare allows up to 512M per cached object, but we can’t really leverage that here.
        Number(response.headers.get('content-length') || 0) <= $fsize.bytesInMegabyte * 25
    ) {
        ctx.waitUntil(
            (async (/* Caching occurs in background via `waitUntil()`. */): Promise<void> => {
                // Cloudflare will not actually cache if headers say not to; {@see https://o5p.me/gMv7W2}.
                const responseForCache = (await $http.prepareResponseForCache(keyRequest, response)) as $type.cf.Response,
                    cachePutResponse = await caches.default.put(keyRequest, responseForCache);
                void auditLogger.log('Caching response server-side.', { responseForCache, cachePutResponse });
                console.log({ responseForCache, cachePutResponse });
            })(),
        );
        response.headers.set('x-cache-status', 'miss'); // i.e., Cache miss.
        //
    } else response.headers.set('x-cache-status', 'dynamic'); // i.e., Not cacheable.

    return response; // Potentially cached async via `waitUntil()`.
};
