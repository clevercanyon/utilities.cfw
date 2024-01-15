/**
 * Test suite.
 */

import { $cfw, $redis } from '#index.ts';
import { $time, type $type } from '@clevercanyon/utilities';
import { describe, expect, test } from 'vitest';

describe('$redis', async () => {
    const mockLoggerInterface: $type.LoggerInterface = {
        withContext: () => mockLoggerInterface,
        log: async () => true,
        debug: async () => true,
        info: async () => true,
        warn: async () => true,
        error: async () => true,
        flush: async () => true,
    };
    const mockStdFetchEventData = {
        ctx: {
            waitUntil: (): void => undefined,
            passThroughOnException: (): void => undefined,
        },
        env: {} as $cfw.StdEnvironment, // None at this time.

        url: new URL('https://x.tld/') as unknown as $type.cf.URL,
        request: new Request('https://x.tld/') as unknown as $type.cf.Request,

        auditLogger: mockLoggerInterface,
        consentLogger: mockLoggerInterface,

        URL: URL as unknown as typeof $type.cf.URL,
        fetch: fetch as unknown as typeof $type.cf.fetch,
        Request: Request as unknown as typeof $type.cf.Request,
        Response: Response as unknown as typeof $type.cf.Response,
    };
    const redis = $redis.instance();

    test('.set(), .get()', async () => {
        await redis.set('testKey', 'testValue');
        expect(await redis.get('testKey')).toBe('testValue');

        await redis.set('testKey', { a: 'a', b: 'b', c: 'c' });
        expect(await redis.get('testKey')).toStrictEqual({ a: 'a', b: 'b', c: 'c' });

        await redis.set('testKey', 'testValue');
        expect(await redis.get('testKey')).toBe('testValue');
    });
    test('.del(), .get()', async () => {
        await redis.del('testKey');
        expect(await redis.get('testKey')).toBe(null);
    });
    test('.set(), .exists()', async () => {
        await redis.set('testKey', 'testValue');
        await redis.set('testKey', 'testValue');
        expect(await redis.exists('testKey')).toBe(1);

        await redis.del('testKey');
        expect(await redis.exists('testKey')).toBe(0);
    });
    test(
        '.rateLimiter()',
        async () => {
            const rateLimiter = $redis.rateLimiter(mockStdFetchEventData, {
                slidingWindow: [10, '10s'], // 10 every 10 seconds.
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 1
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 2
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 3
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 4
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 5
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 6
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 7
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 8
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 9
            expect(await rateLimiter.limit('testKey')).toMatchObject({ success: true }); // 10

            let thrownResponse: unknown;
            try {
                await rateLimiter.limit('testKey'); // 11
            } catch (thrown: unknown) {
                thrownResponse = thrown; // Limit reached; response thrown.
            }
            expect(thrownResponse instanceof Response).toBe(true);
            expect((thrownResponse as $type.Response).status).toBe(429);

            // Blocks until allowed to resume operations given the defined rate limiter.
            expect(await rateLimiter.blockUntilReady('testKey', $time.secondInMilliseconds * 10)).toMatchObject({ success: true });
        },
        { timeout: $time.secondInMilliseconds * 12 },
    );
});
