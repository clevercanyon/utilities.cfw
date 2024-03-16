/**
 * Utility class.
 */

import '#@initialize.ts';

import { $app, $bytes, $class, $crypto, $env, $error, $http, $is, $mm, $obj, $url, $user, type $type } from '@clevercanyon/utilities';

// @ts-ignore -- Broken types.
import { Ai as AiClass } from '@cloudflare/ai';
import type { Ai as AiInstance } from '@cloudflare/ai/dist/ai.d.ts';
import type { SessionOptions as AiSessionOptions } from '@cloudflare/ai/dist/session.d.ts';

/**
 * Defines types.
 */
export type ScheduledEvent = $type.$cfw.ScheduledEvent & Readonly<{}>;

export type ExecutionContext = $type.$cfw.ExecutionContext & Readonly<$type.cfw.ExecutionContext>;
export type Environment = $type.$cfw.Environment & Readonly<{}>;

export type Route = $type.$cfw.Route<RequestContextData>;
export type Routes = Readonly<{ subpathGlobs: { [x: string]: Route } }>;

export type InitialRequestContextData = Readonly<{
    scheduledEvent?: ScheduledEvent;
    ctx: ExecutionContext;
    env: Environment;
    request: $type.cfw.Request;
    routes: Routes;
}>;
export type RequestContextData = $type.$cfw.RequestContextData &
    Readonly<{
        scheduledEvent?: ScheduledEvent;
        ctx: ExecutionContext;
        env: Environment;
        routes: Routes;
    }>;

/**
 * Tracks global init.
 */
let initializedGlobals = false;

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
 * @returns         Promise of a {@see $type.cfw.Response}.
 */
export const handleFetchEvent = async (ircData: InitialRequestContextData): Promise<$type.cfw.Response> => {
    let { request } = ircData;

    const { fetch, caches } = cfw,
        { scheduledEvent, ctx, env, routes } = ircData,
        subrequestCounter = request.c10n?.serviceBinding?.subrequestCounter || { value: 0 };

    await maybeInitializeGlobals(ircData); // Initializes worker globals.

    const Logger = $class.getLogger(), // Initializes base audit and consent loggers.
        //
        auditLoggerBearerToken = $env.get('APP_AUDIT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }),
        consentLoggerBearerToken = $env.get('APP_CONSENT_LOGGER_BEARER_TOKEN', { type: 'string', require: true }),
        //
        baseAuditLogger = new Logger({ cfw: { ctx, subrequestCounter }, endpointToken: auditLoggerBearerToken }),
        baseConsentLogger = new Logger({ cfw: { ctx, subrequestCounter }, endpointToken: consentLoggerBearerToken });

    let auditLogger = baseAuditLogger.withContext({}, { request });

    try {
        let originalRequest = request; // Potentially rewritten.
        request = (await $http.prepareRequest(request, {})) as $type.cfw.Request;

        if (request !== originalRequest /* Reinitializes audit logger. */) {
            auditLogger = baseAuditLogger.withContext({}, { request });
        }
        const url = $url.parse(request.url) as $type.cfw.URL,
            originalURL = $url.parse(originalRequest.url) as $type.cfw.URL,
            consentLogger = baseConsentLogger.withContext({}, { request }),
            rcData = rcDataPrepare({
                scheduledEvent,
                ctx,
                env,

                url,
                request,
                routes,

                fetch,
                caches,
                auditLogger,
                consentLogger,
                subrequestCounter,
            });
        let response: Promise<$type.cfw.Response>; // Initialize.

        for (const [subpathGlob, route] of Object.entries(routes.subpathGlobs))
            if ($mm.test(url.pathname, $url.pathFromAppBase('./') + subpathGlob)) {
                response = handleRouteCache(rcData, route);
                break; // Route found; stop here.
            }
        response ??= $http.prepareResponse(request, { status: 404 }) as Promise<$type.cfw.Response>;

        if (originalURL.searchParams.has('utx_audit_log')) {
            const token = originalURL.searchParams.get('utx_audit_log') || '',
                validToken = auditLoggerBearerToken.split(' ', 2)[1] || '';

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
 * Defines Cloudflare worker global scope.
 */
export const cfw = globalThis as unknown as $type.cfw.ServiceWorkerGlobalScope & {
    fetch(
        this: void, // {@see https://typescript-eslint.io/rules/unbound-method/}.
        ...args: Parameters<$type.cfw.ServiceWorkerGlobalScope['fetch']>
    ): ReturnType<$type.cfw.ServiceWorkerGlobalScope['fetch']>;
};

/**
 * Defines Cloudflare worker AI class.
 */
export const Ai = AiClass as new (
    binding: $type.$cfw.Environment['AI'],
    options?: {
        debug?: boolean;
        apiGateway?: boolean;
        apiAccount?: string;
        apiToken?: string;
        sessionOptions?: AiSessionOptions;
    },
) => AiInstance;

/**
 * Prepares request context data.
 *
 * @param   rcData Writable request context data to prepare.
 *
 * @returns        Readable request context data after having been prepared by this utility.
 */
export const rcDataPrepare = <Type extends $type.Writable<$type.$cfw.RequestContextData>>(rcData: Type): Readonly<Type> => {
    const { subrequestCounter } = rcData;

    rcData.fetch = subrequestCounterProxy(rcData.fetch, subrequestCounter);
    rcData.caches = subrequestCounterProxy(rcData.caches, subrequestCounter);

    rcData.env = { ...rcData.env }; // Shallow clone.
    for (const [key, value] of Object.entries(rcData.env))
        if (/(?:^RT$|^(?:RT_)?(?:AI|D1|R2|KV|QE)(?:_.+)?$)/iu.test(key) && $is.object(value)) {
            (rcData.env as $type.StrKeyable)[key] = subrequestCounterProxy(value, subrequestCounter);
        }
    return $obj.freeze(rcData) as Type;
};

/**
 * Creates a scheduled event request.
 *
 * The distinction here is simply that we use a default IP address and geolocation for scheduled event requests.
 * Cloudflare doesn’t do it by default, but our codebases assume IP and geolocation data will be available; i.e., for
 * every request. Therefore, when fetching scheduled event routes always use this utility to build a request.
 *
 * @param   scheduledEvent Scheduled event.
 * @param   requestInfo    New request info.
 * @param   requestInit    New request init.
 *
 * @returns                Promise of a {@see $type.cfw.Request}.
 */
export const scheduledEventRequest = async (
    scheduledEvent: $type.$cfw.ScheduledEvent,
    requestInfo: $type.cfw.RequestInfo,
    requestInit?: $type.cfw.RequestInit,
): Promise<$type.cfw.Request> => {
    const { Request } = cfw;

    requestInit ??= {}; // Initialize.
    requestInit.cf ??= {}; // Initialize.

    const headers = $http.parseHeaders(requestInit.headers || {}) as $type.cfw.Headers;
    requestInit.headers = headers; // As a reference to our typed `headers`.

    if (scheduledEvent.cron /* Only scheduled CRON event requests. */) {
        // Scheduled CRON event requests get a default IP and geolocation.
        const userIP = '127.13.249.56', // Random private IPv4.
            //
            // Must be in the US such that consent state will allow audit logging.
            // i.e., Non-essential audit logging is only allowed by default in the US.
            userIPGeoData: $user.IPGeoData = {
                ip: userIP,

                city: 'Madawaska',
                region: 'Maine',
                regionCode: 'ME',
                postalCode: '04756',
                continent: 'NA',
                country: 'US',

                colo: 'EWR',
                metroCode: '552',
                latitude: '47.33320',
                longitude: '-68.33160',
                timezone: 'America/New_York',
            };
        headers.set('x-real-ip', userIP);
        headers.set('cf-connecting-ip', userIP);

        $obj.patchDeep(requestInit.cf, {
            ...$obj.omit(userIPGeoData, ['ip']),
            c10n: { scheduledEvent },
        });
    }
    return new Request(requestInfo, requestInit);
};

/**
 * Creates a service binding request.
 *
 * The distinction here is simply that we forward IP address and geolocation data to service bindings. Cloudflare
 * doesn’t do it by default, but our codebase assumes IP and geolocation data will be available; i.e., for every
 * request. Therefore, when fetching from a service binding always use this utility to build a request.
 *
 * Additionally, this passes a parent subrequest counter to the service binding because requests made by a service
 * binding must be added to a parent request’s subrequest counter; i.e, associated with top-level parent request.
 *
 * @param   rcData      Request context data.
 * @param   requestInfo New request info.
 * @param   requestInit New request init.
 *
 * @returns             Promise of a {@see $type.cfw.Request}.
 */
export const serviceBindingRequest = async (
    rcData: $type.$cfw.RequestContextData,
    requestInfo: $type.cfw.RequestInfo,
    requestInit?: $type.cfw.RequestInit,
): Promise<$type.cfw.Request> => {
    const { Request } = cfw, // Parent request, etc.
        { request: parentRequest, subrequestCounter } = rcData;

    requestInit ??= {}; // Initialize.
    requestInit.cf ??= {}; // Initialize.

    const headers = $http.parseHeaders(requestInit.headers || {}) as $type.cfw.Headers;
    requestInit.headers = headers; // As a reference to our typed `headers`.

    const userIP = await $user.ip(parentRequest),
        userIPGeoData = await $user.ipGeoData(parentRequest);

    headers.set('x-real-ip', userIP);
    headers.set('cf-connecting-ip', userIP);

    $obj.patchDeep(requestInit.cf, {
        ...$obj.omit(userIPGeoData, ['ip']),
        c10n: { serviceBinding: { subrequestCounter } },
    });
    return new Request(requestInfo, requestInit);
};

/**
 * Handles route caching.
 *
 * @param   rcData Request context data.
 * @param   route  Route; {@see $type.$cfw.Route}.
 *
 * @returns        Promise of a {@see $type.cfw.Response}.
 */
export const handleRouteCache = async <Type extends $type.$cfw.RequestContextData>(rcData: Type, route: $type.$cfw.Route<Type>): Promise<$type.cfw.Response> => {
    const { Request } = cfw,
        { ctx, url, request, caches } = rcData;

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
    if (
        !['HEAD', 'GET'].includes(keyRequest.method) || //
        !$http.requestHasCacheableMethod(keyRequest) ||
        'none' === route.config?.cacheVersion // Explicitly uncacheable.
    ) {
        return route(rcData); // Not cacheable.
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
            .toLowerCase().split(/\s*,\s*/u).includes('no-store') &&
        //
        response.headers.has('content-length') && // Our own limit is 25 MiB max.
        Number(response.headers.get('content-length')) <= $bytes.inMebibyte * 25 // prettier-ignore
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

// ---
// Misc utilities.

/**
 * Proxies {@see cfw.fetch()} and/or a resource binding.
 *
 * @param   target            {@see cfw.fetch()} or a resource binding.
 * @param   subrequestCounter Subrequest counter; {@see $type.$cfw.SubrequestCounter}.
 *
 * @returns                   A proxied {@see cfw.fetch()} function, or a proxied resource binding.
 *
 * @throws                    If `target` object type is not supported; i.e., as detected using constructor names.
 */
const subrequestCounterProxy = <Type extends object>(target: Type, subrequestCounter: $type.$cfw.SubrequestCounter): Type => {
    if (target === cfw.fetch) {
        return subrequestCountryProxyꓺfetch(subrequestCounter) as Type;
    }
    const targetC9rName = $obj.c9r(target)?.name?.toLowerCase(),
        supportedTargetC9rNames = ['cachestorage', 'cache', 'fetcher', 'd1database', 'd1preparedstatement', 'r2bucket', 'r2multipartupload', 'kvnamespace', 'workerqueue'];

    if (!targetC9rName || !supportedTargetC9rNames.includes(targetC9rName)) {
        throw Error('QGySmpVX'); // Unexpected object type.
    }
    return new Proxy(target, {
        get(target: Type, property: $type.ObjectKey, receiver: unknown): unknown {
            const value = (target as $type.Keyable)[property],
                valueC9rName = $obj.c9r(value)?.name?.toLowerCase();

            if ('cachestorage' === targetC9rName && 'cache' === valueC9rName) {
                return subrequestCounterProxy(value as object, subrequestCounter);
            }
            if ($is.function(value))
                return function (this: unknown, ...args: unknown[]): unknown {
                    const fn = value, // For the sake of added clarity.
                        fnRtnValue = fn.apply(this === receiver ? target : this, args);

                    if ($is.promise(fnRtnValue)) {
                        return fnRtnValue.then((fnRtnValue: unknown): unknown => {
                            return subrequestCounterProxyꓺfnRtnValue(targetC9rName, property, fnRtnValue, subrequestCounter);
                        });
                    }
                    return subrequestCounterProxyꓺfnRtnValue(targetC9rName, property, fnRtnValue, subrequestCounter);
                };
            return value;
        },
    });
};

/**
 * Helps proxy {@see cfw.fetch()} for the purpose of counting subrequests.
 *
 * @param   subrequestCounter Subrequest counter; {@see $type.$cfw.SubrequestCounter}.
 *
 * @returns                   Proxied {@see cfw.fetch()} function.
 */
const subrequestCountryProxyꓺfetch = <Type extends typeof cfw.fetch>(subrequestCounter: $type.$cfw.SubrequestCounter): Type => {
    const { fetch, Request } = cfw;

    return new Proxy(fetch.bind(cfw) as Type, {
        apply(target, thisArg, args: Parameters<Type>) {
            const maxRedirects = 20,
                redirectCounter = { value: 0 };

            let request = new Request(args[0], args[1]),
                url = $url.tryParse(request.url);

            const redirect = request.redirect || 'follow';

            if ('manual' !== request.redirect) {
                request = new Request(request, { redirect: 'manual' });
            }
            subrequestCounter.value++; // Increments counter on initial fetch.

            return target.apply(thisArg, [request]).then((response): $type.cfw.Response | Promise<$type.cfw.Response> => {
                if (url && [301, 302, 303, 307, 308].includes(response.status) && 'follow' === redirect) {
                    if (response.headers.has('location') && redirectCounter.value + 1 <= maxRedirects) {
                        const location = response.headers.get('location') || '',
                            redirectURL = location ? $url.tryParse(location, url) : undefined;

                        if (redirectURL && redirectURL.toString() !== url.toString()) {
                            let redirectRequest = new Request(redirectURL, request);

                            if (url.protocol !== redirectURL.protocol || $url.rootHost(url) !== $url.rootHost(redirectURL))
                                for (const protectedCrossDomainHeader of $http.protectedCrossDomainHeaderNames()) {
                                    redirectRequest.headers.delete(protectedCrossDomainHeader);
                                }
                            if (([301, 302].includes(response.status) && 'POST' === request.method) || 303 === response.status) {
                                redirectRequest = new Request(redirectRequest, { method: 'GET', body: null });
                                redirectRequest.headers.delete('content-type');
                                redirectRequest.headers.delete('content-length');
                                redirectRequest.headers.delete('content-encoding');
                                redirectRequest.headers.delete('transfer-encoding');
                            }
                            if (response.headers.get('referrer-policy')) {
                                redirectRequest.headers.set('referrer-policy', response.headers.get('referrer-policy') as string);
                            }
                            $http.prepareRefererHeader(redirectRequest.headers, url, redirectURL);
                            redirectCounter.value++, subrequestCounter.value++; // Increments counters.

                            return target.apply(thisArg, [redirectRequest]);
                        }
                    }
                }
                return response;
            });
        },
    });
};

/**
 * Helps proxy a resource binding for the purpose of counting subrequests.
 *
 * @param   targetC9rName     The target object’s constructor name; i.e., object type.
 * @param   fnProperty        Requested property on target object, that returned a function.
 * @param   fnRtnValue        Resolved return value of requested property’s function invocation.
 * @param   subrequestCounter Subrequest counter; {@see $type.$cfw.SubrequestCounter}.
 *
 * @returns                   Function return value, which is potentially another proxied subtarget; i.e., as a branch
 *   of the original target. Prior to returning, this utility also handles subrequest counter incrementation.
 */
const subrequestCounterProxyꓺfnRtnValue = (targetC9rName: string, fnProperty: $type.ObjectKey, fnRtnValue: unknown, subrequestCounter: $type.$cfw.SubrequestCounter): unknown => {
    if ($is.object(fnRtnValue)) {
        const fnRtnValueC9rName = $obj.c9r(fnRtnValue)?.name?.toLowerCase();
        if (
            ('cachestorage' === targetC9rName && 'cache' === fnRtnValueC9rName) ||
            (['d1database', 'd1preparedstatement'].includes(targetC9rName) && 'd1preparedstatement' === fnRtnValueC9rName) ||
            ('r2bucket' === targetC9rName && 'r2multipartupload' === fnRtnValueC9rName)
        ) {
            return subrequestCounterProxy(fnRtnValue, subrequestCounter);
        }
    }
    if ($is.string(fnProperty))
        switch (targetC9rName) {
            case 'cache': {
                if (['put', 'match', 'delete'].includes(fnProperty)) {
                    subrequestCounter.value++;
                }
                break;
            }
            case 'fetcher': {
                if (['fetch'].includes(fnProperty)) {
                    subrequestCounter.value++;
                }
                break;
            }
            case 'd1database': {
                if (['dump', 'exec', 'batch'].includes(fnProperty)) {
                    subrequestCounter.value++;
                }
                break;
            }
            case 'd1preparedstatement': {
                if (['all', 'raw', 'first', 'run'].includes(fnProperty)) {
                    subrequestCounter.value++;
                }
                break;
            }
            case 'r2bucket': {
                if (['head', 'get', 'put', 'delete', 'list'].includes(fnProperty)) {
                    subrequestCounter.value++;
                }
                break;
            }
            case 'r2multipartupload': {
                if (['uploadPart', 'complete'].includes(fnProperty)) {
                    subrequestCounter.value++;
                }
                break;
            }
            case 'kvnamespace': {
                if (['get', 'getWithMetadata', 'list', 'put', 'delete'].includes(fnProperty)) {
                    subrequestCounter.value++;
                }
                break;
            }
            case 'workerqueue': {
                if (['send', 'sendBatch'].includes(fnProperty)) {
                    subrequestCounter.value++;
                }
                break;
            }
        }
    return fnRtnValue;
};
