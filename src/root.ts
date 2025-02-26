/**
 * RT utilities.
 */

import '#@initialize.ts';

import { $cfw, $proxy, cfw } from '#index.ts';
import { $app, $fn, $http, $is, $json, $mime, $obj, $time, type $type } from '@clevercanyon/utilities';

/**
 * Defines root package name.
 */
const rootPkgName = '@clevercanyon/workers.hop.gdn';

/**
 * Defines types.
 */
type KVFetchCache = {
    body: string | null;
    init: {
        status: number;
        statusText: string;
        headers: [string, string][];
    };
    error?: {
        message: string;
        cause: $type.ErrorCause;
    };
};
type KVFetchCacheMetadata = {
    lastModifiedTime: number;
    retryAttempts: number;
};
type KVFetchOptions = $type.RequestC10nProps['kvOptions'];

// ---
// Conditional utilities.

/**
 * Checks if current worker is root worker.
 *
 * @returns True if current worker is root worker.
 */
export const isRoot = (): boolean => rootPkgName === $app.pkgName();

// ---
// Binding utilities.

/**
 * Fetches using root service binding.
 *
 * @param   rcData      Request context data.
 * @param   requestInfo New request info.
 * @param   requestInit New request init.
 *
 * @returns             Promise of response from root service binding.
 */
export const service = async (rcData: $type.$cfw.RequestContextData, requestInfo: $type.cfw.RequestInfo, requestInit?: $type.cfw.RequestInit): Promise<$type.cfw.Response> => {
    const { env } = rcData,
        rt = env.RT;

    if (!rt) throw Error('Root service binding unavailable.');

    return rt.fetch(await $cfw.serviceBindingRequest(rcData, requestInfo, requestInit));
};
service.isAvailable = (rcData: $type.$cfw.RequestContextData): boolean => {
    return rcData.env.RT ? true : false;
};

/**
 * Gets root AI binding.
 *
 * @param   rcData Request context data.
 *
 * @returns        Root AI binding.
 */
export const ai = (rcData: $type.$cfw.RequestContextData): $type.cfw.Fetcher => {
    const { env } = rcData,
        ai = env.RT_AI || (isRoot() && env.AI);

    if (!ai) throw Error('Root AI binding unavailable.');

    return ai;
};
ai.isAvailable = (rcData: $type.$cfw.RequestContextData): boolean => {
    return rcData.env.RT_AI || (isRoot() && rcData.env.AI) ? true : false;
};

/**
 * Gets root D1 binding.
 *
 * @param   rcData Request context data.
 *
 * @returns        Root D1 binding.
 */
export const d1 = (rcData: $type.$cfw.RequestContextData): $type.cfw.D1Database => {
    const { env } = rcData,
        d1 = env.RT_D1 || (isRoot() && env.D1);

    if (!d1) throw Error('Root D1 binding unavailable.');

    return d1;
};
d1.isAvailable = (rcData: $type.$cfw.RequestContextData): boolean => {
    return rcData.env.RT_D1 || (isRoot() && rcData.env.D1) ? true : false;
};

/**
 * Gets root R2 binding.
 *
 * @param   rcData Request context data.
 *
 * @returns        Root R2 binding.
 */
export const r2 = (rcData: $type.$cfw.RequestContextData): $type.cfw.R2Bucket => {
    const { env } = rcData,
        r2 = env.RT_R2 || (isRoot() && env.R2);

    if (!r2) throw Error('Root R2 binding unavailable.');

    return r2;
};
r2.isAvailable = (rcData: $type.$cfw.RequestContextData): boolean => {
    return rcData.env.RT_R2 || (isRoot() && rcData.env.R2) ? true : false;
};

/**
 * Gets root KV binding.
 *
 * @param   rcData Request context data.
 *
 * @returns        Root KV binding.
 */
export const kv = (rcData: $type.$cfw.RequestContextData): $type.cfw.KVNamespace => {
    const { env } = rcData,
        kv = env.RT_KV || (isRoot() && env.KV);

    if (!kv) throw Error('Root KV binding unavailable.');

    return kv;
};
kv.isAvailable = (rcData: $type.$cfw.RequestContextData): boolean => {
    return rcData.env.RT_KV || (isRoot() && rcData.env.KV) ? true : false;
};

// ---
// Fetch utilities.

/**
 * Fetches a root resource.
 *
 * @param   rcData      Request context data.
 * @param   requestInfo New request info.
 * @param   requestInit New request init.
 *
 * @returns             Promise of response.
 */
export const fetch = async (rcData: $type.$cfw.RequestContextData, requestInfo: $type.cfw.RequestInfo, requestInit?: $type.cfw.RequestInit): Promise<$type.cfw.Response> => {
    const { Request } = cfw,
        { fetch } = rcData;

    if (isRoot()) {
        return $proxy.worker(rcData, requestInfo, requestInit);
    }
    if (service.isAvailable(rcData)) {
        return service(rcData, requestInfo, requestInit);
    }
    return fetch(new Request(requestInfo, requestInit));
};

/**
 * Fetches a resource using root KV as a cache.
 *
 * Using the root KV as a cache allows for global fetch response caching across datacenters, ensuring that a cached
 * response can be retrieved by all callers, using KV storage, no matter which datacenter a worker is running from.
 *
 * @param   rcData      Request context data.
 * @param   requestInfo New request info.
 * @param   requestInit New request init.
 *
 * @returns             Promise of response.
 */
export const kvFetch = async (rcData: $type.$cfw.RequestContextData, requestInfo: $type.cfw.RequestInfo, requestInit?: $type.cfw.RequestInit): Promise<$type.cfw.Response> => {
    const slug = 'rt-kv-fetch',
        { Request, Response } = cfw,
        { auditLogger, fetch } = rcData;

    const request = new Request(requestInfo, requestInit),
        options = request.c10n?.kvOptions,
        opts = $obj.defaults({}, options || {}, {
            cacheMinAge: $time.hourInSeconds, // Minimum time between retries, in seconds.
            cacheMaxAge: request.cf?.cacheTtl || $time.yearInSeconds, // Cache expiration, in seconds.
            cacheMaxRetries: 5, // After `cacheMinTtl` expires.
            fetch: options?.fetch
                ? options.fetch.length >= 2 //
                    ? $fn.curry(options.fetch, rcData)
                    : options.fetch
                : fetch,
        }) as Required<KVFetchOptions & { fetch: typeof fetch }>;

    if (!$http.requestTypeIsCacheable(request) || !kv.isAvailable(rcData)) {
        return opts.fetch(request); // Not cacheable or KV unavailable.
    }
    const cacheKey = slug + ':cache:response:' + (await $http.requestHash(request));

    const {
        value: cacheꓺvalue, //
        metadata: cacheꓺmetadata,
    } = await kv(rcData).getWithMetadata(cacheKey, { type: 'json' });

    let cache: KVFetchCache | null | undefined = cacheꓺvalue as KVFetchCache,
        cacheMetadata: KVFetchCacheMetadata | null | undefined = cacheꓺmetadata as KVFetchCacheMetadata,
        cacheLastModifiedTime = $is.integer(cacheMetadata?.lastModifiedTime) ? cacheMetadata.lastModifiedTime : 0,
        cacheRetryAttempts = $is.integer(cacheMetadata?.retryAttempts) ? cacheMetadata.retryAttempts : -1;

    if (
        $is.object(cache) && // and any of the following are true.
        ($time.stamp() - cacheLastModifiedTime <= opts.cacheMinAge || // Still within min TTL.
            cache.init.status < 400 || // Cached response status code is not in an HTTP error status range.
            (cacheRetryAttempts >= opts.cacheMaxRetries && ![404].includes(cache.init.status))) // Max retries.
    ) {
        return new Response(cache.body, cache.init);
    }
    let response: $type.cfw.Response, // Initialize.
        responseBody: string | null = null,
        error: Error | undefined;

    try {
        response = await opts.fetch(request);
        //
    } catch (thrown: unknown) {
        response = new Response(null, {
            status: 500, // Internal server error.
            statusText: $http.responseStatusText(500) + ($is.error(thrown) ? '; ' + thrown.message : ''),
        });
        error ??= Error('Fetch error' + ($is.error(thrown) ? '; ' + thrown.message : '') + '.', { cause: slug + ':try-catch' });
    }
    if (!$is.nul(response.body)) {
        const responseContentType = response.headers.get('content-type') || '',
            responseCleanContentType = $mime.typeClean(responseContentType);

        if (!['text/plain', 'application/json', 'application/ld+json', 'application/xml', 'image/svg+xml', 'text/xml'].includes(responseCleanContentType)) {
            error ??= Error('Uncacheable HTTP response type: ' + responseCleanContentType + '.', { cause: slug + ':response-type' });
        } else {
            responseBody = await response.text(); // Textual response body.
        }
    }
    if (error) {
        void auditLogger.warn('KV fetch error.', { request, response, error });
    }
    await kv(rcData).put(
        cacheKey,
        $json.stringify({
            body: responseBody,
            init: {
                status: response.status,
                statusText: response.statusText,
                headers: [...response.headers.entries()],
            },
            ...(error ? { error: { message: error.message, cause: String(error.cause) } } : {}),
        }),
        {
            expirationTtl: opts.cacheMaxAge,
            metadata: {
                lastModifiedTime: $time.stamp(),
                retryAttempts: error ? cacheRetryAttempts + 1 : 0,
            },
        },
    );
    return new Response(responseBody, response);
};

// ---
// Counter utilities.

/**
 * Gets root counter value.
 *
 * @param   rcData Request context data.
 * @param   key    Counter key.
 *
 * @returns        Promise of root counter value.
 */
export const counter = async (rcData: $type.$cfw.RequestContextData, key: string): Promise<number> => {
    return ((await d1(rcData).prepare('SELECT `value` FROM `counters` WHERE `key` = ?1 LIMIT 1').bind(key).first('value')) as number) || 0;
};
counter.isAvailable = d1.isAvailable; // Powered by root D1 database.

/**
 * Bumps root counter value.
 *
 * @param rcData Request context data.
 * @param key    Counter key.
 * @param by     By; default is `1`.
 */
export const bumpCounter = async (rcData: $type.$cfw.RequestContextData, key: string, by: number = 1): Promise<void> => {
    await d1(rcData).prepare('INSERT INTO `counters` (`key`, `value`) VALUES(?1, ?2) ON CONFLICT(`key`) DO UPDATE SET `value` = `value` + ?2').bind(key, by).run();
};
