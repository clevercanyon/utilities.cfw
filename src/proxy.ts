/**
 * Redis utilities.
 */

import '#@initialize.ts';

import { $cfw, cfw } from '#index.ts';
import { $arr, $crypto, $env, $http, $is, $mime, $obj, $str, $time, $to, $url, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type FetchOptions = {
    proxy?: {
        host?: string;
        port?: number;
        username?: string;
        password?: string;
    };
    method?: 'HEAD' | 'GET';
    headers?: $type.cfw.HeadersInit;

    uaBotAppend?: string;
    maxRedirects?: number;
    timeout?: number; // In milliseconds.
};
type RequiredFetchOptions = Required<FetchOptions> & {
    proxy: Required<FetchOptions['proxy']>;
    headers: $type.cfw.Headers;
};
type FakeUAHeaders = $type.ReadonlyDeep<{
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
type FakeUAHeadersResponsePayload = $type.ReadonlyDeep<{
    ok: boolean;
    error?: { message: string };
    data?: FakeUAHeaders; // When `ok` is true.
}>;

/**
 * Performs an HTTP fetch using a proxy.
 *
 * Note: Only `HEAD`, `GET` methods supported at this time.
 *
 * @param   rcData  Request context data; {@see $cfw.StdRequestContextData}.
 * @param   url     Parseable URL; i.e., string or URL instance.
 * @param   options Some required; {@see FetchOptions}.
 *
 * @returns         Promise of HTTP response.
 */
export const fetch = async (rcData: $cfw.StdRequestContextData, parseable: $type.cfw.URL | string, options?: FetchOptions): Promise<$type.cfw.Response> => {
    const { Response } = cfw,
        url = $url.tryParse(parseable),
        opts = $obj.defaults({}, options || {}, {
            proxy: {
                host: $env.get('SSR_APP_ROTATING_PROXY_HOST', { type: 'string' }) || $env.get('APP_ROTATING_PROXY_HOST', { type: 'string' }),
                port: $env.get('SSR_APP_ROTATING_PROXY_PORT', { type: 'number' }) || $env.get('APP_ROTATING_PROXY_PORT', { type: 'number' }) || 0,

                username: $env.get('SSR_APP_ROTATING_PROXY_USERNAME', { type: 'string' }) || $env.get('APP_ROTATING_PROXY_USERNAME', { type: 'string' }),
                password: $env.get('SSR_APP_ROTATING_PROXY_PASSWORD', { type: 'string' }) || $env.get('APP_ROTATING_PROXY_PASSWORD', { type: 'string' }),
            },
            method: 'GET',
            headers: {},

            uaBotAppend: '',
            maxRedirects: 2,
            timeout: $time.secondInMilliseconds * 15,
        }) as RequiredFetchOptions;

    opts.headers = $http.parseHeaders(opts.headers) as $type.cfw.Headers;

    if (!opts.headers.has('user-agent'))
        for (const [name, value] of Object.entries(await fetchꓺfakeUAHeaders(rcData))) {
            opts.headers.set(name, value);
        }
    if (opts.uaBotAppend /* e.g., `SomeCoolBot/1.0.0` */) {
        const currentUA = opts.headers.get('user-agent') || ''; // Current user-agent header.
        opts.headers.set('user-agent', $str.trim(currentUA + ' ' + $str.trim(opts.uaBotAppend)));
    }
    if (!url || !opts.proxy?.host || !opts.proxy?.port || !opts.method || !opts.timeout)
        return new Response(null, {
            status: 400,
            statusText: $http.responseStatusText(400),
            headers: { 'content-type': $mime.contentType('.txt') },
        });
    return await Promise.race([fetchꓺwaitTimeout(rcData, opts), fetchꓺviaSocket(rcData, url, opts)]);
};

/**
 * Creates a timeout promise.
 *
 * @param   rcData  Request context data; {@see $cfw.StdRequestContextData}.
 * @param   options Required options; {@see RequiredFetchOptions}.
 *
 * @returns         Timeout promise suitable for a race.
 */
const fetchꓺwaitTimeout = async (rcData: $cfw.StdRequestContextData, opts: RequiredFetchOptions): Promise<$type.cfw.Response> => {
    const { Response } = cfw;

    return new Promise((resolve): void => {
        setTimeout((): void => {
            resolve(
                new Response(null, {
                    status: 408,
                    statusText: $http.responseStatusText(408),
                    headers: { 'content-type': $mime.contentType('.txt') },
                }),
            );
        }, opts.timeout);
    });
};

/**
 * Performs an HTTP fetch using a proxy.
 *
 * @param   rcData    Request context data; {@see $cfw.StdRequestContextData}.
 * @param   url       Parseable URL; i.e., string or URL instance.
 * @param   options   Required options; {@see RequiredFetchOptions}.
 * @param   redirects Do not pass. Internal use only.
 *
 * @returns           Promise of HTTP response.
 */
const fetchꓺviaSocket = async (rcData: $cfw.StdRequestContextData, url: $type.cfw.URL, opts: RequiredFetchOptions, redirects: number = 0): Promise<$type.cfw.Response> => {
    const { Blob, Response } = cfw,
        { auditLogger } = rcData,
        sockets = await import('cloudflare:sockets');

    try {
        // ---
        // Socket setup.

        const socket = sockets.connect({
                hostname: opts.proxy.host,
                port: opts.proxy.port,
            }),
            writer = socket.writable.getWriter() as $type.cfw.WritableStreamDefaultWriter<Uint8Array>,
            reader = socket.readable.getReader() as $type.cfw.ReadableStreamDefaultReader<Uint8Array>;

        // ---
        // Request routines.

        const headers: Set<string> = new Set();

        headers.add(`host: ${url.hostname}`);

        if (opts.proxy.username && opts.proxy.password) {
            headers.add(`proxy-authorization: ${'Basic ' + $crypto.base64Encode(`${opts.proxy.username}:${opts.proxy.password}`)}`);
        }
        for (const [name, value] of opts.headers.entries()) {
            headers.add(`${name}: ${value}`);
        }
        await writer.write(
            $str.textEncode(
                opts.method + ' ' + url.toString() + ' HTTP/1.0\r\n' +
                [...headers].join('\r\n') + '\r\n\r\n',
            ), // prettier-ignore
        );
        // ---
        // Response routines.

        const crlf = '\r\n\r\n',
            crlfBytes = $str.textEncode(crlf);

        let rawHTTPResponseChunks: Uint8Array[] = [],
            rawHTTPResponseBytes: Uint8Array,
            rawHTTPResponseCRLFByteIndex: number,
            rawHTTPResponseHeaders: string,
            //
            responseStatus: undefined | number,
            responseHeaders: undefined | $type.cfw.Headers,
            responseBody: undefined | string | $type.cfw.Blob;

        while (reader /* Stops when `done`. */) {
            const { done, value: chunk } = await reader.read();
            if (chunk) rawHTTPResponseChunks.push(chunk);
            if (done) break; // Stops on last chunk.
        }
        rawHTTPResponseBytes = new Uint8Array(await new Blob(rawHTTPResponseChunks).arrayBuffer());
        rawHTTPResponseCRLFByteIndex = $arr.indexOfSequence(rawHTTPResponseBytes, crlfBytes);

        if (-1 !== rawHTTPResponseCRLFByteIndex) {
            rawHTTPResponseHeaders = $str.textDecode(rawHTTPResponseBytes.slice(0, rawHTTPResponseCRLFByteIndex));
        } else rawHTTPResponseHeaders = $str.textDecode(rawHTTPResponseBytes); // Only headers; e.g., `HEAD` request type.

        responseStatus = Number(rawHTTPResponseHeaders.match(/^HTTP\/[0-9.]+\s+([0-9]+)/iu)?.[1] || 500);
        responseHeaders = $http.parseHeaders(rawHTTPResponseHeaders) as $type.cfw.Headers;

        if (-1 !== rawHTTPResponseCRLFByteIndex && $mime.typeIsBinary(responseHeaders.get('content-type') || '')) {
            responseBody = new Blob([rawHTTPResponseBytes.slice(rawHTTPResponseCRLFByteIndex + crlfBytes.length)]);
            //
        } else if (-1 !== rawHTTPResponseCRLFByteIndex) {
            responseBody = $str.textDecode(rawHTTPResponseBytes.slice(rawHTTPResponseCRLFByteIndex + crlfBytes.length));
        }
        await socket.close(); // Closes socket and streams.

        if (!responseStatus || !responseHeaders)
            return new Response(null, {
                status: 421,
                statusText: $http.responseStatusText(421),
                headers: { 'content-type': $mime.contentType('.txt') },
            });
        if ([301, 302, 303, 307, 308].includes(responseStatus) && ['HEAD', 'GET'].includes(opts.method))
            if (responseHeaders.has('location') && redirects + 1 <= opts.maxRedirects) {
                const location = responseHeaders.get('location') || '',
                    redirectURL = location ? $url.tryParse(location, url) : undefined;

                // Follows redirects, but only when URL actually changes.
                if (redirectURL && redirectURL.toString() !== url.toString()) {
                    return fetchꓺviaSocket(rcData, redirectURL, opts, redirects + 1);
                }
            }
        return new Response(responseBody, {
            status: responseStatus,
            statusText: $http.responseStatusText(responseStatus),
            headers: responseHeaders,
        });
    } catch (thrown) {
        // Record error for debugging purposes.
        void auditLogger.warn('Proxied fetch failure.', { thrown });

        return new Response(null, {
            status: 500,
            statusText: $http.responseStatusText(500),
            headers: { 'content-type': $mime.contentType('.txt') },
        });
    }
};

/**
 * Gets fake UA headers.
 *
 * @param   rcData Request context data; {@see $cfw.StdRequestContextData}.
 *
 * @returns        Promise of fake UA headers.
 */
const fetchꓺfakeUAHeaders = async (rcData: $cfw.StdRequestContextData): Promise<FakeUAHeaders> => {
    const { env: { UT: ut }, auditLogger } = rcData, // prettier-ignore
        defaultUAHeaders = {
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'sec-ch-ua': 'Google Chrome;v="80", "Chromium";v="80", ";Not A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': 'Windows',
            'sec-fetch-site': 'none',
            'sec-fetch-mod': '',
            'sec-fetch-user': '?1',
            'accept-encoding': 'gzip, deflate',
            'accept-language': 'en-US,en;q=0.9',
        };
    if ($cfw.is(rcData, '/utilities')) {
        const { env: { KV: kv } } = rcData, // prettier-ignore
            kvKey = 'fakeUAHeaders:' + String($crypto.randomNumber(1, 100)),
            uaHeaders = (await kv.get(kvKey, { type: 'json' })) as FakeUAHeaders;

        if (!$is.plainObject(uaHeaders)) {
            void auditLogger.warn('Fake UA headers failure.', { uaHeaders, error: Error('q9UTub4N') });
            return defaultUAHeaders;
        }
        return uaHeaders;
    }
    if (ut /* Utilities worker service binding exists? */) {
        const payload = await ut
            .fetch(
                await $cfw.serviceBindingRequest(
                    rcData,
                    $url.addQueryVars(
                        { randomIndex: String($crypto.randomNumber(1, 100)) }, //
                        'https://workers.hop.gdn/utilities/api/fake-ua-headers/v1',
                    ),
                ),
            )
            .then(async (response): Promise<FakeUAHeadersResponsePayload> => {
                return $to.plainObject(await response.json()) as FakeUAHeadersResponsePayload;
            })
            .catch((thrown: unknown): void => {
                void auditLogger.warn('Fake UA headers error thrown.', { thrown });
            });
        if (!payload?.ok || !$is.plainObject(payload.data)) {
            void auditLogger.warn('Fake UA headers failure.', { payload, error: Error('DkkbNUJr') });
            return defaultUAHeaders;
        }
        return payload.data;
    }
    return defaultUAHeaders;
};
