/**
 * Test suite.
 */

import { $test } from '#index.ts';
import { describe, expect, test } from 'vitest';

describe('$test', async () => {
    test('.rc()', async () => {
        await $test.rc(async () => {
            expect(true).toBe(true);
        });
    });
});
