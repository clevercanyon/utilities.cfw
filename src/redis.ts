/**
 * Redis utilities.
 */

import '#@initialize.ts';

import { type StdFetchEventData } from '#cfw.ts';
import { $class, $env, $fn, $http, $is, $mime, $obj } from '@clevercanyon/utilities';
import { Ratelimit as RateLimiterCore } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';

/**
 * LRU Map class.
 */
const LRUMap = $class.getLRUMap();

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
    timeout?: number;
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

        return new Redis(
            {
                url: opts.restURL,
                token: opts.restToken,

                responseEncoding: false, // Do not base64-encode response data, which adds network latency.
                automaticDeserialization: true, // Yes, use JSON to encode/decode HTTP request/response data.
                enableTelemetry: false, // Just for good measure. The environment variable is what’s important.

                retry: {
                    retries: 5,
                    backoff: (retryAttempts: number) => Math.exp(retryAttempts) * 50,
                    /**
                     * - Math.exp(1) * 50 = 135.91409142295225.
                     * - Math.exp(2) * 50 = 369.4528049465325.
                     * - Math.exp(3) * 50 = 1004.2768461593834.
                     * - Math.exp(4) * 50 = 2729.907501657212.
                     * - Math.exp(5) * 50 = 7420.65795512883.
                     */
                },
                signal: undefined, // Not used at this time.
            },
            // Constructor always reads env variable for this specific setting.
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
 * @param   feData                   {@see StdFetchEventData}.
 * @param   options                  Options (all optional); {@see RateLimiterOptions}.
 *
 * @returns {@see RateLimiter}         Instance.
 */
export const rateLimiter = (feData: StdFetchEventData, options?: RateLimiterOptions): RateLimiter => {
    const { auditLogger, request, ctx } = feData,
        limiter = rateLimiterCore(options);

    return {
        limiter, // RateLimiterCore.

        async limit(...args: Parameters<RateLimiterCore['limit']>): ReturnType<RateLimiterCore['limit']> {
            const limiterResponse = await limiter.limit(...args);

            if ($is.promise(limiterResponse.pending)) {
                ctx.waitUntil(limiterResponse.pending); // e.g., Analytics, multiregion sync.
            }
            if (!limiterResponse.success) {
                void auditLogger.info('429: ' + $http.responseStatusText('429'), {
                    rateLimiter: limiter,
                    rateLimiterMethod: 'limit',
                    rateLimiterResponse: limiterResponse,
                });
                throw $http.prepareResponse(request, {
                    status: 429, // Too many requests in this scenario.
                    headers: { 'content-type': $mime.contentType('.txt') },
                    body: $http.responseStatusText('429'), // Too many requests.
                });
            }
            return limiterResponse;
        },
        async blockUntilReady(...args: Parameters<RateLimiterCore['blockUntilReady']>): ReturnType<RateLimiterCore['blockUntilReady']> {
            const limiterResponse = await limiter.blockUntilReady(...args);

            if ($is.promise(limiterResponse.pending)) {
                ctx.waitUntil(limiterResponse.pending); // e.g., Analytics, multiregion sync.
            }
            if (!limiterResponse.success) {
                void auditLogger.info('429: ' + $http.responseStatusText('429'), {
                    rateLimiter: limiter,
                    rateLimiterMethod: 'blockUntilReady',
                    rateLimiterResponse: limiterResponse,
                });
                throw $http.prepareResponse(request, {
                    status: 429, // Too many requests in this scenario.
                    headers: { 'content-type': $mime.contentType('.txt') },
                    body: $http.responseStatusText('429'), // Too many requests.
                });
            }
            return limiterResponse;
        },
    };
};

// ---
// Misc utilities.

/**
 * Gets rate limiter core.
 *
 * @param   options                      Options (all optional); {@see RateLimiterOptions}.
 *
 * @returns {@see RateLimiterCore}         Instance.
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
