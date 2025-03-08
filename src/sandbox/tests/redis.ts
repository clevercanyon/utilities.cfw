/**
 * Test suite.
 */

import { $redis, cfw } from '#index.ts';
import * as $test from '#test.ts';
import { $time, type $type } from '@clevercanyon/utilities';
import { describe, expect, test } from 'vitest';

describe('$redis', async () => {
    const { Response } = cfw,
        redis = $redis.instance();

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
    test('.rateLimiter()', { timeout: $time.secondInMilliseconds * 12 }, async () => {
        await $test.rc(async (rcData) => {
            const rateLimiter = $redis.rateLimiter(rcData, {
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

            let thrown: unknown; // Initialize.
            try {
                await rateLimiter.limit('testKey'); // 11
            } catch (unknownThrown: unknown) {
                thrown = unknownThrown; // Limit reached; response thrown.
            }
            expect(thrown instanceof Response).toBe(true);
            expect((thrown as $type.cfw.Response).status).toBe(429);

            // Blocks until allowed to resume operations given the defined rate limiter.
            expect(await rateLimiter.blockUntilReady('testKey', $time.secondInMilliseconds * 10)).toMatchObject({ success: true });
        });
    });
});
