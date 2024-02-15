/**
 * Redis utilities.
 */

import '#@initialize.ts';

import { cfw, type StdRequestContextData } from '#cfw.ts';
import { $crypto, $http, $mime, $obj, $str, $time, $url, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type FetchOptions = {
    proxy: {
        host: string;
        port: number;
        username?: string;
        password?: string;
    };
    headers?: $type.cfw.Headers | { [x: string]: string };
    timeout?: number; // In milliseconds.
};

/**
 * Performs an HTTP fetch using a proxy.
 *
 * Note: Only `GET` method is supported at this time.
 *
 * @param   rcData  Request context data; {@see StdRequestContextData}.
 * @param   url     Parseable URL; i.e., string or URL instance.
 * @param   options Some required; {@see FetchOptions}.
 *
 * @returns         Promise of HTTP response.
 */
export const fetch = async (rcData: StdRequestContextData, parseable: $type.cfw.URL | string, options?: FetchOptions): Promise<$type.cfw.Response> => {
    const { Response } = cfw,
        url = $url.tryParse(parseable),
        opts = $obj.defaults({}, options || {}, {
            headers: {},
            timeout: $time.secondInMilliseconds * 15,
        }) as Required<FetchOptions>;

    if (!url) {
        return new Response(null, {
            status: 400,
            statusText: $http.responseStatusText(400),
            headers: { 'content-type': $mime.contentType('.txt') },
        });
    }
    if (!opts.proxy || !opts.proxy.host || !opts.proxy.port) {
        throw Error('AzwqQc85'); // Missing required options.
    }
    return await Promise.race([fetchꓺwaitTimeout(rcData, opts), fetchꓺviaSocket(rcData, url, opts)]);
};

/**
 * Creates a timeout promise.
 *
 * @param   rcData  Request context data; {@see StdRequestContextData}.
 * @param   options Required options; {@see Required<FetchOptions>}.
 *
 * @returns         Timeout promise suitable for a race.
 */
const fetchꓺwaitTimeout = async (rcData: StdRequestContextData, opts: Required<FetchOptions>): Promise<$type.cfw.Response> => {
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
 * @param   rcData  Request context data; {@see StdRequestContextData}.
 * @param   url     Parseable URL; i.e., string or URL instance.
 * @param   options Required options; {@see Required<FetchOptions>}.
 *
 * @returns         Promise of HTTP response.
 */
const fetchꓺviaSocket = async (rcData: StdRequestContextData, url: $type.cfw.URL, opts: Required<FetchOptions>): Promise<$type.cfw.Response> => {
    const { Response } = cfw,
        sockets = await import('cloudflare:sockets');

    try {
        const socket = sockets.connect({ hostname: opts.proxy.host, port: opts.proxy.port }),
            { readable, writable } = socket,
            writer = writable.getWriter(),
            headers: Set<string> = new Set();

        headers.add(`host: ${url.hostname}`);

        if (opts.proxy.username && opts.proxy.password) {
            headers.add(`proxy-authorization: ${'Basic ' + $crypto.base64Encode(`${opts.proxy.username}:${opts.proxy.password}`)}`);
        }
        for (const [name, value] of $http.parseHeaders(opts.headers).entries()) {
            headers.add(`${name}: ${value}`);
        }
        await writer.write(
            $str.textEncoder.encode(
                `GET ${url.toString()} HTTP/1.0` + '\r\n' +
                `${[...headers].join('\r\n')}` + '\r\n\r\n',
            ), // prettier-ignore
        );
        await writer.close(); // Close writable stream.

        const rawHTTPResponse = await new Response(readable, { headers: { 'content-type': $mime.contentType('.txt') } }).text();
        await socket.close(); // We can go ahead and close the socket now.

        const rawHTTPResponseCRLFIndex = rawHTTPResponse.indexOf('\r\n\r\n');
        if (!rawHTTPResponse || rawHTTPResponseCRLFIndex === -1) {
            return new Response(null, {
                status: 421,
                statusText: $http.responseStatusText(421),
                headers: { 'content-type': $mime.contentType('.txt') },
            });
        }
        const rawHTTPResponseHeaders = rawHTTPResponse.slice(0, rawHTTPResponseCRLFIndex).trim(),
            rawHTTPResponseBody = rawHTTPResponse.slice(rawHTTPResponseCRLFIndex + 4).trim();

        const responseStatus = Number(rawHTTPResponseHeaders.match(/^HTTP\/1\.0\s+([0-9]+)/iu)?.[1] || 0),
            responseHeaders = $http.parseHeaders(rawHTTPResponseHeaders) as $type.cfw.Headers,
            responseBody = rawHTTPResponseBody;

        return new Response(responseBody, {
            status: responseStatus,
            statusText: $http.responseStatusText(responseStatus),
            headers: responseHeaders,
        });
    } catch (thrown) {
        return new Response(null, {
            status: 500,
            statusText: $http.responseStatusText(500),
            headers: { 'content-type': $mime.contentType('.txt') },
        });
    }
};
