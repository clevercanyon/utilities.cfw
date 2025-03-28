/**
 * Redis utilities.
 */

import '#@initialize.ts';

import { cfw } from '#index.ts';
import { $arr, $crypto, $env, $gzip, $http, $is, $str, $time, $url, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type FetchOptions = {
    method?: 'OPTIONS' | 'HEAD' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    redirect?: 'follow' | 'manual';
    headers?: $type.cfw.HeadersInit;
    body?: string | null | undefined;
    c10n?: Pick<$type.RequestC10nProps, 'proxyOptions'>;
};
type InternalFetchOptions = Required<Omit<FetchOptions, 'headers' | 'c10n'>> &
    Required<$type.RequestC10nProps['proxyOptions']> & {
        headers: $type.cfw.Headers;
        proxy: Required<Required<Required<$type.RequestC10nProps>['proxyOptions']>['proxy']>;
    };

/**
 * Defines deprecated types.
 *
 * @deprecated Use `requestInfo`, `requestInit`. The preferred method of passing options is via
 *   `(requestInfo|requestInit).c10n.proxyOptions`. Others, such as `method`, `headers`, `body`, `redirect` should be
 *   passed via `requestInfo|requestInit`.
 */
export type DeprecatedFetchOptions = Pick<FetchOptions, 'method' | 'redirect' | 'headers' | 'body'> & $type.RequestC10nProps['proxyOptions'];

/**
 * Performs an HTTP fetch using a proxy.
 *
 * Note: Only `HEAD`, `GET` methods supported at this time.
 *
 * @param   rcData      Request context data.
 * @param   requestInfo New request info.
 * @param   requestInit New request init.
 *
 * @returns             Promise of HTTP response.
 *
 * @todo: Remove type ` | ($type.cfw.RequestInit & DeprecatedFetchOptions)`.
 *        It exists only for backwards compatibility with `DeprecatedFetchOptions`.
 *        The preferred method of passing options is via `(requestInfo|requestInit).c10n.proxyOptions`.
 *        Others, such as `method`, `headers`, `body`, `redirect` should be passed via `requestInfo|requestInit`.
 */
export const fetch = async (
    rcData: $type.$cfw.RequestContextData,
    requestInfo: $type.cfw.RequestInfo,
    requestInit?: $type.cfw.RequestInit | ($type.cfw.RequestInit & DeprecatedFetchOptions),
): Promise<$type.cfw.Response> => {
    //
    const { Request, Response } = cfw,
        request = requestInfo instanceof Request ? requestInfo : undefined,
        url = $url.tryParse(request ? request.url : (requestInfo as $type.cfw.URL | string));

    const opts = {
        method:
            requestInit?.method || //
            request?.method ||
            'GET', // Default value.

        redirect:
            requestInit?.redirect || //
            request?.redirect ||
            'follow', // Default value.

        headers: $http.parseHeaders(
            requestInit?.headers || //
                request?.headers ||
                {}, // Default value.
        ) as $type.cfw.Headers,

        body:
            ($is.string(requestInit?.body) ? requestInit.body : '') || //
            (request?.body && !request.bodyUsed ? await request.text() : '') ||
            null, // Default value.

        proxy: {
            host:
                requestInit?.c10n?.proxyOptions?.proxy?.host || //
                (requestInit as $type.cfw.RequestInit & DeprecatedFetchOptions)?.proxy?.host ||
                request?.c10n?.proxyOptions?.proxy?.host ||
                $env.get('APP_ROTATING_PROXY_HOST', { type: 'string' }) ||
                '', // Default value.

            port:
                requestInit?.c10n?.proxyOptions?.proxy?.port || //
                (requestInit as $type.cfw.RequestInit & DeprecatedFetchOptions)?.proxy?.port ||
                request?.c10n?.proxyOptions?.proxy?.port ||
                $env.get('APP_ROTATING_PROXY_PORT', { type: 'number' }) ||
                80, // Default value.

            username:
                requestInit?.c10n?.proxyOptions?.proxy?.username || //
                (requestInit as $type.cfw.RequestInit & DeprecatedFetchOptions)?.proxy?.username ||
                request?.c10n?.proxyOptions?.proxy?.username ||
                $env.get('APP_ROTATING_PROXY_USERNAME', { type: 'string' }) ||
                '', // Default value.

            password:
                requestInit?.c10n?.proxyOptions?.proxy?.password || //
                (requestInit as $type.cfw.RequestInit & DeprecatedFetchOptions)?.proxy?.password ||
                request?.c10n?.proxyOptions?.proxy?.password ||
                $env.get('APP_ROTATING_PROXY_PASSWORD', { type: 'string' }) ||
                '', // Default value.
        },
        uaBotAppend:
            requestInit?.c10n?.proxyOptions?.uaBotAppend || //
            (requestInit as $type.cfw.RequestInit & DeprecatedFetchOptions)?.uaBotAppend ||
            request?.c10n?.proxyOptions?.uaBotAppend ||
            '', // Default value.

        maxRedirects:
            requestInit?.c10n?.proxyOptions?.maxRedirects || //
            (requestInit as $type.cfw.RequestInit & DeprecatedFetchOptions)?.maxRedirects ||
            request?.c10n?.proxyOptions?.maxRedirects ||
            20, // Default value.

        timeout:
            requestInit?.c10n?.proxyOptions?.timeout || //
            (requestInit as $type.cfw.RequestInit & DeprecatedFetchOptions)?.timeout ||
            request?.c10n?.proxyOptions?.timeout ||
            $time.secondInMilliseconds * 15, // Default value.
    } as InternalFetchOptions;

    if (!opts.headers.has('user-agent'))
        for (const [name, value] of Object.entries($http.browserUAHeaders())) {
            if (!opts.headers.has(name)) opts.headers.set(name, value);
        }
    if (opts.uaBotAppend /* e.g., `SomeCoolBot/1.0.0` */) {
        const currentUA = opts.headers.get('user-agent') || ''; // Current user-agent header.
        opts.headers.set('user-agent', $str.trim(currentUA + ' ' + $str.trim(opts.uaBotAppend)));
    }
    if (
        !url || // Options validation.
        !['OPTIONS', 'HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(opts.method) ||
        !['follow', 'manual'].includes(opts.redirect) ||
        !opts.proxy.host ||
        !opts.proxy.port ||
        !opts.timeout
    ) {
        return new Response(null, {
            status: 400,
            statusText: $http.responseStatusText(400) + '; Invalid proxy fetch options.',
        });
    }
    return await Promise.race([fetchꓺwaitTimeout(rcData, opts), fetchꓺviaSocket(rcData, url, opts)]);
};

/**
 * Fetches worker using another worker as a proxy.
 *
 * @param   rcData      Request context data.
 * @param   requestInfo New request info.
 * @param   requestInit New request init.
 *
 * @returns             Promise of a {@see $type.cfw.Response}.
 */
export const worker = async (rcData: $type.$cfw.RequestContextData, requestInfo: $type.cfw.RequestInfo, requestInit?: $type.cfw.RequestInit): Promise<$type.cfw.Response> => {
    const { Request } = cfw,
        { fetch } = rcData,
        proxyRoute = 'https://worker-proxy.hop.gdn/';

    if ($is.string(requestInfo) || $is.url(requestInfo)) {
        requestInfo = $url.addQueryVar('url', requestInfo.toString(), proxyRoute);
        //
    } else if (requestInfo instanceof Request) {
        requestInfo = new Request($url.addQueryVar('url', requestInfo.url, proxyRoute), requestInfo);
    }
    return fetch(requestInfo, requestInit);
};

// ---
// Misc utilities.

/**
 * Creates a timeout promise.
 *
 * @param   rcData  Request context data.
 * @param   options Required; {@see InternalFetchOptions}.
 *
 * @returns         Promise of a {@see $type.cfw.Response} suitable for a race.
 */
const fetchꓺwaitTimeout = async (rcData: $type.$cfw.RequestContextData, opts: InternalFetchOptions): Promise<$type.cfw.Response> => {
    const { Response } = cfw;

    return new Promise((resolve): void => {
        setTimeout((): void => {
            resolve(
                new Response(null, {
                    status: 408,
                    statusText: $http.responseStatusText(408),
                }),
            );
        }, opts.timeout);
    });
};

/**
 * Performs an HTTP fetch using a proxy.
 *
 * @param   rcData    Request context data.
 * @param   url       Parseable URL; i.e., string or URL instance.
 * @param   options   Required; {@see InternalFetchOptions}.
 * @param   redirects Do not pass. Internal use only.
 *
 * @returns           Promise of HTTP response.
 */
const fetchꓺviaSocket = async (rcData: $type.$cfw.RequestContextData, url: $type.cfw.URL, opts: InternalFetchOptions, redirects: number = 0): Promise<$type.cfw.Response> => {
    const { Blob, Headers, Response } = cfw,
        { auditLogger, subrequestCounter } = rcData,
        sockets = await import('cloudflare:sockets');

    try {
        // ---
        // Socket setup.

        subrequestCounter.value++;

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
                [...headers].join('\r\n') + '\r\n\r\n' +
                (opts.body || ''),
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
            responseBody: undefined | string | $type.cfw.Blob,
            responseBodyDecodingError: undefined | Error;

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

        responseStatus = Number(rawHTTPResponseHeaders.match(/^HTTP\/[0-9.]+\s+([0-9]+)/iu)?.[1]) || 500;
        responseHeaders = $http.parseHeaders(rawHTTPResponseHeaders) as $type.cfw.Headers;

        if (-1 !== rawHTTPResponseCRLFByteIndex) {
            const rawResponseBodyBytes = rawHTTPResponseBytes.slice(rawHTTPResponseCRLFByteIndex + crlfBytes.length);

            if ($http.contentIsBinary(responseHeaders)) {
                responseBody = new Blob([rawResponseBodyBytes]);
                //
            } else if ($http.contentIsEncoded(responseHeaders)) {
                switch (responseHeaders.get('content-encoding')?.toLowerCase()) {
                    case 'gzip': {
                        responseBody = await $gzip.decode(rawResponseBodyBytes);
                        break;
                    }
                    case 'deflate': {
                        responseBody = await $gzip.decode(rawResponseBodyBytes, { deflate: true });
                        break;
                    }
                    default: {
                        responseBodyDecodingError = Error('Unknown encoding.');
                    }
                }
            } else {
                responseBody = $str.textDecode(rawResponseBodyBytes);
            }
        }
        await socket.close(); // Closes socket and streams.

        if (!responseStatus || !responseHeaders || responseBodyDecodingError)
            return new Response(null, {
                status: 421,
                statusText: $http.responseStatusText(421) + '; Failed to parse response.',
            });
        if ([301, 302, 303, 307, 308].includes(responseStatus) && 'follow' === opts.redirect) {
            if (responseHeaders.has('location') && redirects + 1 <= opts.maxRedirects) {
                const location = responseHeaders.get('location') || '',
                    redirectURL = location ? $url.tryParse(location, url) : undefined;

                if (redirectURL && redirectURL.toString() !== url.toString()) {
                    const redirectOpts = { ...opts, headers: new Headers(opts.headers) };

                    if (url.protocol !== redirectURL.protocol || $url.rootHost(url) !== $url.rootHost(redirectURL))
                        for (const protectedCrossDomainHeader of $http.protectedCrossDomainHeaderNames()) {
                            redirectOpts.headers.delete(protectedCrossDomainHeader);
                        }
                    if (([301, 302].includes(responseStatus) && 'POST' === opts.method) || 303 === responseStatus) {
                        (redirectOpts.method = 'GET'), (redirectOpts.body = null);
                        redirectOpts.headers.delete('content-type');
                        redirectOpts.headers.delete('content-length');
                        redirectOpts.headers.delete('content-encoding');
                        redirectOpts.headers.delete('transfer-encoding');
                    }
                    if (responseHeaders.get('referrer-policy')) {
                        redirectOpts.headers.set('referrer-policy', responseHeaders.get('referrer-policy') as string);
                    }
                    $http.prepareRefererHeader(redirectOpts.headers, url, redirectURL);

                    return fetchꓺviaSocket(rcData, redirectURL, redirectOpts, redirects + 1);
                }
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
            status: 500, // Internal server error.
            statusText: $http.responseStatusText(500) + '; Proxied fetch failure.',
        });
    }
};
