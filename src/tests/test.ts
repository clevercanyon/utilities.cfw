/**
 * Test suite.
 */

import * as $test from '#test.ts';
import { describe, expect, test } from 'vitest';

describe('$test', async () => {
    test('.rc()', async () => {
        await $test.rc(async () => {
            expect(true).toBe(true);
        });
    });
});
