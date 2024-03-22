/**
 * Redis utilities.
 */

import '#@initialize.ts';

import { $class, $env, $fn, $http, $is, $json, $mime, $obj, $time, type $type } from '@clevercanyon/utilities';
import { Ratelimit as RateLimiterCore } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare.mjs';

/**
 * Defines types.
 */
export type { Redis };

export type InstanceOptions = {
    restURL?: string;
    restToken?: string;
    maxConcurrentConnections?: number;
};
export type RateLimiterOptions = InstanceOptions & {
    prefix?: string;
    slidingWindow?: [
        // `[10, '10s']`;  `ms`, `s`, `m`, `h`, `d`.
        Parameters<typeof RateLimiterCore.slidingWindow>[0], //
        Parameters<typeof RateLimiterCore.slidingWindow>[1],
    ];
    ephemeralCacheMaxSize?: number;
    analytics?: boolean;
    timeout?: number; // In milliseconds.
};
export type RateLimiter = {
    limiter: RateLimiterCore;
    limit(...args: Parameters<RateLimiterCore['limit']>): ReturnType<RateLimiterCore['limit']>;
    blockUntilReady(...args: Parameters<RateLimiterCore['blockUntilReady']>): ReturnType<RateLimiterCore['blockUntilReady']>;
};

/**
 * Defines instance option keys.
 */
const instanceOptionKeys = [
    'restURL', //
    'restToken',
    'maxConcurrentConnections',
];

/**
 * LRU Map class.
 */
const LRUMap = $class.getLRUMap();

/**
 * Gets instance.
 *
 * - Setting a key; {@see https://o5p.me/mALpon}.
 * - Getting a key; {@see https://o5p.me/QVoCMM}.
 * - Check if key exists; {@see https://o5p.me/uvUI54}.
 *
 * @param   options            Options (all optional); {@see InstanceOptions}.
 *
 * @returns {@see Redis}         Instance.
 */
export const instance = $fn.memo(
    {
        deep: true,
        maxSize: 64, // Upper limit purely as a safeguard against craziness.
        // To maintain proper memoization of this utility we may transform cache keys.
        // Ensures no args, or `options: {}`, are each the same as passing `options: undefined`.
        transformKey: (args: unknown[]): unknown[] => (args.length && $is.notEmpty(args[0]) ? args : [undefined]),
    },
    (options?: InstanceOptions): Redis => {
        const opts = $obj.defaults({}, options || {}, {
            restURL: $env.get('SSR_APP_UPSTASH_REDIS_REST_URL', { type: 'string' }) || $env.get('APP_UPSTASH_REDIS_REST_URL', { type: 'string' }),
            restToken: $env.get('SSR_APP_UPSTASH_REDIS_REST_TOKEN', { type: 'string' }) || $env.get('APP_UPSTASH_REDIS_REST_TOKEN', { type: 'string' }),
            maxConcurrentConnections:
                $env.get('SSR_APP_UPSTASH_REDIS_MAX_CONCURRENT_CONNECTIONS', { type: 'number' }) || //
                $env.get('APP_UPSTASH_REDIS_MAX_CONCURRENT_CONNECTIONS', { type: 'number' }) ||
                100, // The Upstash free plan via Digital Ocean allows up to 100 concurrent connections.
        }) as Required<InstanceOptions>;

        if (!opts.restURL || !opts.restToken) {
            throw Error('3MtyvPsc'); // Missing options.
        }
        return new Redis(
            {
                url: opts.restURL,
                token: opts.restToken,

                responseEncoding: false, // Do not base64-encode response data, which adds network latency.
                automaticDeserialization: true, // Yes, use JSON to encode/decode HTTP request/response data.
                enableTelemetry: false, // Just for good measure. The environment variable is what’s important.

                retry: {
                    retries: 5, // Maximum upstash retry attempts.
                    backoff: (retryAttempts: number) => Math.exp(retryAttempts) * 50,
                    /**
                     * Regarding retry attempts and timeouts.
                     *
                     * - Math.exp(1) * 50 = 135.91409142295225.
                     * - Math.exp(2) * 50 = 369.4528049465325.
                     * - Math.exp(3) * 50 = 1004.2768461593834.
                     * - Math.exp(4) * 50 = 2729.907501657212.
                     * - Math.exp(5) * 50 = 7420.65795512883.
                     *
                     * A Cloudflare worker attempts to wait on all promises to finish resolving via `ctx.waitUntil()`.
                     * Therefore, total retry time must be well under 30 seconds for Cloudflare compatibility. That is
                     * all the time that a single worker request is allowed to take via `ctx.waitUntil()` promises.
                     */
                },
                signal: AbortSignal.timeout($time.secondInMilliseconds * 5),
            },
            { UPSTASH_DISABLE_TELEMETRY: '1' }, // Don’t report back to Upstash.
        );
    },
);

/**
 * Gets rate limiter.
 *
 * - Using rate limiter; {@see https://o5p.me/8ZIrm1}.
 * - Other rate limit features; {@see https://o5p.me/gJmt6n}.
 *
 * @param   rcData  Request context data.
 * @param   options All optional; {@see RateLimiterOptions}.
 *
 * @returns         Instance of {@see RateLimiter}.
 */
export const rateLimiter = (rcData: $type.$cfw.RequestContextData, options?: RateLimiterOptions): RateLimiter => {
    const { ctx, url, request, auditLogger } = rcData,
        limiter = rateLimiterCore(options);

    return $obj.freeze({
        limiter, // RateLimiterCore.

        async limit(...args: Parameters<RateLimiterCore['limit']>): ReturnType<RateLimiterCore['limit']> {
            rcData.subrequestCounter.value += 2; // Possible read and write requests.
            const limiterResponse = await limiter.limit(...args);

            if ($is.promise(limiterResponse.pending)) {
                rcData.subrequestCounter.value++; // Adds additional pending request to counter.
                ctx.waitUntil(limiterResponse.pending); // e.g., Analytics, multiregion sync.
            }
            if (!limiterResponse.success) {
                void auditLogger.info('429: ' + $http.responseStatusText(429), {
                    rateLimiter: limiter,
                    rateLimiterMethod: 'limit',
                    rateLimiterResponse: limiterResponse,
                });
                if ($http.requestExpectsJSON(request, url)) {
                    throw await $http.prepareResponse(request, {
                        status: 429, // Too many requests.
                        headers: { 'content-type': $json.contentType() },
                        body: $json.stringify({ ok: false, error: { message: $http.responseStatusText(429) } }, { pretty: true }),
                    });
                } else {
                    throw await $http.prepareResponse(request, {
                        status: 429, // Too many requests.
                        headers: { 'content-type': $mime.contentType('.txt') },
                        body: $http.responseStatusText(429),
                    });
                }
            }
            return limiterResponse;
        },
        async blockUntilReady(...args: Parameters<RateLimiterCore['blockUntilReady']>): ReturnType<RateLimiterCore['blockUntilReady']> {
            rcData.subrequestCounter.value += 2; // Possible read and write requests.
            const limiterResponse = await limiter.blockUntilReady(...args);

            if ($is.promise(limiterResponse.pending)) {
                rcData.subrequestCounter.value++; // Adds additional pending request to counter.
                ctx.waitUntil(limiterResponse.pending); // e.g., Analytics, multiregion sync.
            }
            if (!limiterResponse.success) {
                void auditLogger.info('429: ' + $http.responseStatusText(429), {
                    rateLimiter: limiter,
                    rateLimiterMethod: 'blockUntilReady',
                    rateLimiterResponse: limiterResponse,
                });
                if ($http.requestExpectsJSON(request, url)) {
                    throw await $http.prepareResponse(request, {
                        status: 429, // Too many requests.
                        headers: { 'content-type': $json.contentType() },
                        body: $json.stringify({ ok: false, error: { message: $http.responseStatusText(429) } }, { pretty: true }),
                    });
                } else {
                    throw await $http.prepareResponse(request, {
                        status: 429, // Too many requests.
                        headers: { 'content-type': $mime.contentType('.txt') },
                        body: $http.responseStatusText(429),
                    });
                }
            }
            return limiterResponse;
        },
    });
};

// ---
// Misc utilities.

/**
 * Gets rate limiter core.
 *
 * @param   options All optional; {@see RateLimiterOptions}.
 *
 * @returns         Instance of {@see RateLimiterCore}.
 */
const rateLimiterCore = $fn.memo(
    {
        deep: true,
        maxSize: 64, // Upper limit purely as a safeguard against craziness.
        // To maintain proper memoization of this utility we may transform cache keys.
        // Ensures no args, `options: {} | { slidingWindow: [10, '10s'] }`, is the same as passing `options: undefined`.
        transformKey: (args: unknown[]): unknown[] => (args.length && $is.notEmpty(args[0]) && !$is.deepEqual(args[0], { slidingWindow: [10, '10s'] }) ? args : [undefined]),
    },
    (options?: RateLimiterOptions): RateLimiterCore => {
        const instanceOpts = $obj.defaults({}, $obj.pick(options || {}, instanceOptionKeys), {
                restURL: $env.get('SSR_APP_UPSTASH_RATE_LIMIT_REDIS_REST_URL', { type: 'string' }) || $env.get('APP_UPSTASH_RATE_LIMIT_REDIS_REST_URL', { type: 'string' }),
                restToken: $env.get('SSR_APP_UPSTASH_RATE_LIMIT_REDIS_REST_TOKEN', { type: 'string' }) || $env.get('APP_UPSTASH_RATE_LIMIT_REDIS_REST_TOKEN', { type: 'string' }),
                maxConcurrentConnections:
                    $env.get('SSR_APP_UPSTASH_RATE_LIMIT_REDIS_MAX_CONCURRENT_CONNECTIONS', { type: 'number' }) || //
                    $env.get('APP_UPSTASH_RATE_LIMIT_REDIS_MAX_CONCURRENT_CONNECTIONS', { type: 'number' }) ||
                    100, // The Upstash free plan via Digital Ocean allows up to 100 concurrent connections.
            }) as unknown as Required<InstanceOptions>,
            //
            opts = $obj.defaults({}, $obj.omit(options || {}, instanceOptionKeys), {
                prefix: '', // Default key prefix is set below, based on options.
                slidingWindow: [10, '10s'], // e.g., `10` requests every `10s` periodicity.
                ephemeralCacheMaxSize: 10240, // 1048576b = 1MB, x 5 = 5242880b, / ~512b per entry, = 10240.
                analytics: false, // Enabling analytics uses an additional 'command' per `.limit()` invocation, and persistent storage keys.
                // We don’t use Upstash proper, we use it via Digital Ocean, which doesn’t support automatic eviction, so we shouldn’t enable analytics.
                timeout: 0, // If network issues arise, we allow requests in after this delay, when greater than `0`.
            }) as unknown as Required<Omit<RateLimiterOptions, keyof InstanceOptions>>;

        if (!instanceOpts.restURL || !instanceOpts.restToken) {
            throw Error('AnExu6Nx'); // Missing options.
        }
        if (!opts.prefix /* Automatic key prefix using sliding window. */) {
            opts.prefix = 'rate-limit:' + String(opts.slidingWindow[0]) + ':' + opts.slidingWindow[1];
        }
        return new RateLimiterCore({
            redis: instance(instanceOpts), // Potentially an already-memoized instance.

            prefix: opts.prefix,
            limiter: RateLimiterCore.slidingWindow(...opts.slidingWindow),
            ephemeralCache:
                opts.ephemeralCacheMaxSize > 0 //
                    ? new LRUMap([], { maxSize: opts.ephemeralCacheMaxSize })
                    : false, // Explicitly no ephemeral cache.
            analytics: opts.analytics,
            timeout: opts.timeout,
        });
    },
);
