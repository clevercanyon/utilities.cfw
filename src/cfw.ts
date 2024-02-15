/**
 * Utility class.
 */

import '#@initialize.ts';

import { $app, $class, $crypto, $env, $error, $fsize, $http, $is, $mm, $obj, $url, $user, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type ExecutionContext = Readonly<$type.cfw.ExecutionContext>;
export type Environment = StdEnvironment;

export type Route = ((rcData: RequestContextData) => Promise<$type.cfw.Response>) & {
    config?: Required<$http.RouteConfig>;
};
export type Routes = Readonly<{ subpathGlobs: { [x: string]: Route } }>;

export type InitialRequestContextData = Readonly<{
    ctx: ExecutionContext;
    env: Environment;
    request: $type.cfw.Request;
    routes: Routes;
}>;
export type RequestContextData = StdRequestContextData &
    Readonly<{
        ctx: ExecutionContext;
        env: Environment;
        routes: Routes;
    }>;

/**
 * Defines common types across CFW/CFP.
 */
export type StdExecutionContext = Readonly<
    Pick<
        $type.cfw.ExecutionContext | Parameters<$type.cfw.PagesFunction>[0],
        // These are the two required keys.
        'waitUntil' | 'passThroughOnException'
    >
>;
export type StdEnvironment = Readonly<{
    UT: $type.cfw.Fetcher;
    D1: $type.cfw.D1Database;
    R2: $type.cfw.R2Bucket;
    KV: $type.cfw.KVNamespace;
    DO: $type.cfw.DurableObjectNamespace;
}>;
export type StdRequestContextData = Readonly<{
    ctx: StdExecutionContext;
    env: StdEnvironment;

    url: $type.cfw.URL;
    request: $type.cfw.Request;

    auditLogger: $type.LoggerInterface;
    consentLogger: $type.LoggerInterface;
}>;

/**
 * Tracks global init.
 */
let initializedGlobals = false;

/**
 * Cloudflare worker global scope.
 */
export const cfw = globalThis as unknown as $type.cfw.ServiceWorkerGlobalScope & {
    fetch(
        this: $type.cfw.ServiceWorkerGlobalScope, //
        ...args: Parameters<$type.cfw.ServiceWorkerGlobalScope['fetch']>
    ): ReturnType<$type.cfw.ServiceWorkerGlobalScope['fetch']>;
};
cfw.fetch = cfw.fetch.bind(cfw); // Avoids us calling an unbound function.

/**
 * Initializes worker globals.
 *
 * @param ircData Initial request context data.
 */
const maybeInitializeGlobals = async (ircData: InitialRequestContextData): Promise<void> => {
    if (initializedGlobals) return;
    initializedGlobals = true;

    $env.capture(
        '@global', // Captures primitive environment variables.
        Object.fromEntries(
            Object.entries(ircData.env).filter(([, value]): boolean => {
                // Anything that is not a primitive value; e.g., KV, D1, or other bindings,
                // must be accessed in a request-specific way using {@see RequestContextData}.
                return $is.primitive(value);
            }),
        ),
    );
};

/**
 * Handles fetch events.
 *
 * @param   ircData Initial request context data.
 *
 * @returns         Response promise.
 */
export const handleFetchEvent = async (ircData: InitialRequestContextData): Promise<$type.cfw.Response> => {
    const { ctx, env, routes } = ircData;
    let { request } = ircData; // Rewritable.

    await maybeInitializeGlobals(ircData); // Initializes worker globals.

    const Logger = $class.getLogger(), // Initializes base audit and consent loggers.
        baseAuditLogger = new Logger({ endpointToken: $env.get('APP_AUDIT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }) }),
        baseConsentLogger = new Logger({ endpointToken: $env.get('APP_CONSENT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }) });

    // Initializes audit logger early so it’s available for any errors below.
    // However, `request` is potentially rewritten, so reinitialize if it changes.
    let auditLogger = baseAuditLogger.withContext({}, { cfw: { ctx }, request });

    try {
        let originalRequest = request; // Potentially rewritten.
        request = (await $http.prepareRequest(request, {})) as $type.cfw.Request;

        if (request !== originalRequest /* Reinitializes using rewritten request. */) {
            auditLogger = baseAuditLogger.withContext({}, { cfw: { ctx }, request });
        }
        const url = $url.parse(request.url) as $type.cfw.URL,
            consentLogger = baseConsentLogger.withContext({}, { cfw: { ctx }, request }),
            rcData = $obj.freeze({
                ctx,
                env,
                routes,

                url,
                request,

                auditLogger,
                consentLogger,
            });
        let response: Promise<$type.cfw.Response>; // Initialize.

        for (const [subpathGlob, route] of Object.entries(routes.subpathGlobs))
            if ($mm.test(url.pathname, $url.pathFromAppBase('./') + subpathGlob)) {
                response = handleFetchCache(rcData, route);
                break; // Route found; stop here.
            }
        response ??= $http.prepareResponse(request, { status: 404 }) as Promise<$type.cfw.Response>;

        if (url.searchParams.has('utx_audit_log')) {
            const token = url.searchParams.get('utx_audit_log') || '',
                validToken = $env.get('APP_AUDIT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }).split(' ', 2)[1] || '';

            if (token && validToken && $crypto.safeEqual(token, validToken)) {
                void auditLogger.log(url.toString(), { response: await response });
            }
        }
        return response;
        //
    } catch (thrown) {
        if ($is.response(thrown)) {
            return thrown as $type.cfw.Response;
        }
        const message = $error.safeMessageFrom(thrown, { default: '9eMw8Ave' });
        void auditLogger.error('500: ' + message, { thrown });

        return $http.prepareResponse(request, {
            status: 500, // Failed status in this scenario.
            body: message, // Safe message from whatever was thrown.
        }) as Promise<$type.cfw.Response>;
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
 * @param   rcData      Request context data; {@see StdRequestContextData}.
 * @param   requestInfo New request info; {@see $type.cfw.RequestInfo}.
 * @param   requestInit New request init; {@see $type.cfw.RequestInit}.
 *
 * @returns             Promise of a {@see $type.cfw.Request}.
 */
export const serviceBindingRequest = async (rcData: StdRequestContextData, requestInfo: $type.cfw.RequestInfo, requestInit?: $type.cfw.RequestInit): Promise<$type.cfw.Request> => {
    const { Request } = cfw,
        { request: originalRequest } = rcData;

    const importantParentRequestInit = {
        headers: { 'cf-connecting-ip': await $user.ip(originalRequest) },
        cf: $obj.omit($obj.cloneDeep(await $user.ipGeoData(originalRequest)), ['ip']),
    };
    return new Request(
        requestInfo, // e.g., Service binding URL.
        $obj.mergeDeep(importantParentRequestInit, requestInit) as $type.cfw.RequestInit,
    );
};

// ---
// Misc utilities.

/**
 * Handles fetch caching.
 *
 * @param   rcData Request context data.
 * @param   route  Route handler.
 *
 * @returns        Response promise.
 */
const handleFetchCache = async (rcData: RequestContextData, route: Route): Promise<$type.cfw.Response> => {
    const { caches, Request } = cfw,
        { ctx, url, request } = rcData;

    // Populates cache key.

    let key, cachedResponse; // Initialize.

    const varyOn = new Set(route.config?.varyOn || []);
    for (const v of varyOn) if (!request.headers.has(v)) varyOn.delete(v);

    if ((!route.config || route.config.enableCORs) && request.headers.has('origin')) {
        varyOn.add('origin'); // CORs requires us to vary on origin.
    } else varyOn.delete('origin'); // Must not vary on origin.

    key = 'v=' + (route.config?.cacheVersion || $app.buildTime().toStamp()).toString();
    for (const v of varyOn) key += '&' + v + '=' + (request.headers.get(v) || '');

    const keyURL = $url.removeCSOQueryVars(url); // e.g., `ut[mx]_`, `_ck`, etc.
    keyURL.searchParams.set('_ck', key), keyURL.searchParams.sort(); // Optimizes cache.
    const keyRequest = new Request(keyURL.toString(), request);

    // Checks if request is cacheable.

    if (!['HEAD', 'GET'].includes(keyRequest.method) || !$http.requestHasCacheableMethod(keyRequest)) {
        return route(rcData); // Not cacheable; use async route.
    }
    // Reads response for this request from HTTP cache.

    if ((cachedResponse = await caches.default.match(keyRequest, { ignoreMethod: true }))) {
        return $http.prepareCachedResponse(keyRequest, cachedResponse) as Promise<$type.cfw.Response>;
    }
    // Routes request and writes response to HTTP cache.

    const response = await route(rcData); // Awaits response so we can cache.
    if (
        !response.webSocket &&
        206 !== response.status &&
        'GET' === keyRequest.method &&
        //
        '*' !== response.headers.get('vary') &&
        !(response.headers.get('cdn-cache-control') || '')
            .toLowerCase().split(/,\s*/u).includes('no-store') &&
        //
        response.headers.has('content-length') && // Our own limit is 25 MiB max.
        Number(response.headers.get('content-length')) <= $fsize.bytesInMebibyte * 25 // prettier-ignore
    ) {
        ctx.waitUntil(
            (async (/* Caching occurs in background via `waitUntil()`. */): Promise<void> => {
                // Cloudflare will not actually cache if headers say not to; {@see https://o5p.me/gMv7W2}.
                const responseForCache = (await $http.prepareResponseForCache(keyRequest, response)) as $type.cfw.Response;
                await caches.default.put(keyRequest, responseForCache);
            })(),
        );
        response.headers.set('x-cache-status', 'miss'); // i.e., Cache miss.
    }
    return response; // Potentially cached async via `waitUntil()`.
};
