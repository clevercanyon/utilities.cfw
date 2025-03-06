/**
 * Test suite.
 */

import * as $test from '#test.ts';
import { describe, expect, test } from 'vitest';

describe('$test', async () => {
    test('.rc()', async () => {
        const data = await $test.rc(async () => {
            const data = { ok: true };
            expect(data).toStrictEqual({ ok: true });
            return data;
        });
        expect(data).toStrictEqual({ ok: true });
    });
});
