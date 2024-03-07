/**
 * RT utilities.
 */

import '#@initialize.ts';

import { $cfw } from '#index.ts';
import { $app, $crypto, $is, $obj, $to, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type UAHeaderOptions = {
    randomIndex?: number;
};
export type UAHeaders = $type.ReadonlyDeep<{
    'user-agent': string;

    'accept': string;
    'accept-encoding': string;
    'accept-language': string;

    'sec-ch-ua': string;
    'sec-ch-ua-mobile': string;
    'sec-ch-ua-platform': string;
    'sec-fetch-site': string;
    'sec-fetch-mod': string;
    'sec-fetch-user': string;

    'upgrade-insecure-requests': string;
}>;

/**
 * Defines root package name.
 */
const rootPkgName = '@clevercanyon/workers.hop.gdn';

// ---
// Binding utilities.

/**
 * Fetches using root service binding.
 *
 * @param   rcData      Request context data; {@see $cfw.StdRequestContextData}.
 * @param   requestInfo New request info; {@see $type.cfw.RequestInfo}.
 * @param   requestInit New request init; {@see $type.cfw.RequestInit}.
 *
 * @returns             Promise of response from root service binding.
 */
export const service = async (rcData: $cfw.StdRequestContextData, requestInfo: $type.cfw.RequestInfo, requestInit?: $type.cfw.RequestInit): Promise<$type.cfw.Response> => {
    const { env } = rcData,
        rt = env.RT;

    if (!rt) throw Error('Root service binding unavailable.');

    return rt.fetch(await $cfw.serviceBindingRequest(rcData, requestInfo, requestInit));
};
service.isAvailable = (rcData: $cfw.StdRequestContextData): boolean => {
    return rcData.env.RT ? true : false;
};

/**
 * Gets root AI binding.
 *
 * @param   rcData Request context data; {@see $cfw.StdRequestContextData}.
 *
 * @returns        Root AI binding.
 */
export const ai = (rcData: $cfw.StdRequestContextData): $type.cfw.Fetcher => {
    const { env } = rcData,
        ai = env.RT_AI || (rootPkgName === $app.pkgName() && env.AI);

    if (!ai) throw Error('Root AI binding unavailable.');

    return ai;
};
ai.isAvailable = (rcData: $cfw.StdRequestContextData): boolean => {
    return rcData.env.RT_AI || (rootPkgName === $app.pkgName() && rcData.env.AI) ? true : false;
};

/**
 * Gets root D1 binding.
 *
 * @param   rcData Request context data; {@see $cfw.StdRequestContextData}.
 *
 * @returns        Root D1 binding.
 */
export const d1 = (rcData: $cfw.StdRequestContextData): $type.cfw.D1Database => {
    const { env } = rcData,
        d1 = env.RT_D1 || (rootPkgName === $app.pkgName() && env.D1);

    if (!d1) throw Error('Root D1 binding unavailable.');

    return d1;
};
d1.isAvailable = (rcData: $cfw.StdRequestContextData): boolean => {
    return rcData.env.RT_D1 || (rootPkgName === $app.pkgName() && rcData.env.D1) ? true : false;
};

/**
 * Gets root R2 binding.
 *
 * @param   rcData Request context data; {@see $cfw.StdRequestContextData}.
 *
 * @returns        Root R2 binding.
 */
export const r2 = (rcData: $cfw.StdRequestContextData): $type.cfw.R2Bucket => {
    const { env } = rcData,
        r2 = env.RT_R2 || (rootPkgName === $app.pkgName() && env.R2);

    if (!r2) throw Error('Root R2 binding unavailable.');

    return r2;
};
r2.isAvailable = (rcData: $cfw.StdRequestContextData): boolean => {
    return rcData.env.RT_R2 || (rootPkgName === $app.pkgName() && rcData.env.R2) ? true : false;
};

/**
 * Gets root KV binding.
 *
 * @param   rcData Request context data; {@see $cfw.StdRequestContextData}.
 *
 * @returns        Root KV binding.
 */
export const kv = (rcData: $cfw.StdRequestContextData): $type.cfw.KVNamespace => {
    const { env } = rcData,
        kv = env.RT_KV || (rootPkgName === $app.pkgName() && env.KV);

    if (!kv) throw Error('Root KV binding unavailable.');

    return kv;
};
kv.isAvailable = (rcData: $cfw.StdRequestContextData): boolean => {
    return rcData.env.RT_KV || (rootPkgName === $app.pkgName() && rcData.env.KV) ? true : false;
};

// ---
// UA header utilities.

/**
 * Fetches root UA headers.
 *
 * @param   rcData  Request context data; {@see $cfw.StdRequestContextData}.
 * @param   options All optional; {@see UAHeaderOptions}.
 *
 * @returns         Promise of root UA headers.
 */
export const uaHeaders = async (rcData: $cfw.StdRequestContextData, options?: UAHeaderOptions): Promise<UAHeaders> => {
    const opts = $obj.defaults({}, options || {}, { randomIndex: $crypto.randomNumber(1, 100) }) as Required<UAHeaderOptions>,
        kvKey = 'ua-headers:' + String($to.integerBetween(opts.randomIndex, 1, 100)),
        headers = (await kv(rcData).get(kvKey, { type: 'json' })) as UAHeaders;

    if (!$is.plainObject(headers)) {
        throw Error('UA headers failure.');
    }
    return headers;
};
uaHeaders.urlSafeOptionKeys = ['randomIndex'] as string[];
uaHeaders.isAvailable = kv.isAvailable;

// ---
// Counter utilities.

/**
 * Gets root counter value.
 *
 * @param   key Counter key.
 *
 * @returns     Promise of root counter value.
 */
export const counter = async (rcData: $cfw.StdRequestContextData, key: string): Promise<number> => {
    return (
        ((await d1(rcData)
            .prepare(
                'SELECT `value`' +
                    ' FROM `counters`' +
                    //
                    ' WHERE' +
                    ' `key` = ?1' +
                    //
                    ' LIMIT 1',
            )
            .bind(key)
            .first('value')) as number) || 0
    );
};
counter.isAvailable = d1.isAvailable; // Powered by root D1 database.

/**
 * Bumps root counter value.
 *
 * @param key Counter key.
 * @param by  By; default is `1`.
 */
export const bumpCounter = async (rcData: $cfw.StdRequestContextData, key: string, by: number = 1): Promise<void> => {
    await d1(rcData)
        .prepare(
            'INSERT INTO `counters` (`key`, `value`)' +
                ' VALUES(?1, ?2)' +
                //
                ' ON CONFLICT(`key`) DO UPDATE' +
                ' SET `value` = `value` + ?2',
        )
        .bind(key, by)
        .run();
};
