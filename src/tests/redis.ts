/**
 * Test suite.
 */

import { $redis } from '#index.ts';
import { $time, type $type } from '@clevercanyon/utilities';
import { describe, expect, test } from 'vitest';

describe('$redis', async () => {
    const mockLogger: $type.LoggerInterface = {
        withContext: () => mockLogger,
        log: async () => true,
        debug: async () => true,
        info: async () => true,
        warn: async () => true,
        error: async () => true,
        flush: async () => true,
    };
    const mockFetchEventData = {
        request: new Request('https://x.tld/') as unknown as $type.cf.Request,
        env: {},
        ctx: {
            waitUntil: (): void => undefined,
            passThroughOnException: (): void => undefined,
        },
        routes: { subpathGlobs: {} },
        url: new URL('https://x.tld/'),
        auditLogger: mockLogger,
        consentLogger: mockLogger,
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
            const rateLimiter = $redis.rateLimiter(mockFetchEventData, {
                slidingWindow: [10, '10s'], // 10 every 10 seconds.
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            expect(await rateLimiter.limit('testKey')).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
            let thrownResponse: unknown;
            try {
                await rateLimiter.limit('testKey');
            } catch (thrown: unknown) {
                thrownResponse = thrown;
            }
            expect(thrownResponse instanceof Response).toBe(true);
            expect((thrownResponse as $type.Response).status).toBe(429);

            expect(await rateLimiter.blockUntilReady('testKey', $time.secondInMilliseconds * 10)).toMatchObject({
                limit: 10,
                success: true,
                pending: Promise.resolve(),
            });
        },
        { timeout: $time.secondInMilliseconds * 12 },
    );
});
