/**
 * API utilities.
 */

import '#@initialize.ts';

import { $error, $http, $is, $json, $obj, $str, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type JSONRequestPayload<Type extends object = object> = { data: Type };
export type JSONResponsePayload<Type extends object = object> = $type.ReadonlyDeep<{
    ok: boolean;
    error?: { message: string };
    data?: Type;
}>;
export type CatchThrownOptions = {
    thrown: unknown;
    responseType: 'none' | 'json';
    responseConfig: $http.ResponseConfig;
    expectedCauses: string[];

    readableResponseStream?: $type.cfw.ReadableStream;
    writableResponseStreamWriter?: $type.cfw.WritableStreamDefaultWriter;
    writableResponseProgress?: { complete: boolean };
};

/**
 * Catches an error thrown by an API.
 *
 * @param rcData  Request context data.
 * @param thrown  Thrown; e.g., error, response.
 * @param options {@see CatchThrownOptions}.
 */
export const catchThrown = async (rcData: $type.$cfw.RequestContextData, options: CatchThrownOptions): Promise<void> => {
    const { auditLogger } = rcData,
        opts = $obj.defaults({}, options) as Required<CatchThrownOptions>,
        //
        { thrown, responseType, responseConfig, expectedCauses } = opts,
        { readableResponseStream, writableResponseStreamWriter, writableResponseProgress } = opts;

    if ($is.response(thrown)) throw thrown;

    const message = $error.safeMessageFrom(thrown, {
        expectedCauses,
        default: 'Unexpected API failure.',
    });
    if (!$error.thrownByExpectedCause(thrown, { expectedCauses })) {
        void auditLogger.error(message, { error: { message }, thrown });
    }
    responseConfig.status = 500;

    responseConfig.maxAge = 0;
    responseConfig.sMaxAge = 0;
    responseConfig.staleAge = 0;

    responseConfig.headers = {};
    responseConfig.appendHeaders = {};

    responseConfig.body = undefined;
    responseConfig.encodeBody = undefined;

    switch (responseType) {
        case 'json': {
            responseConfig.status = 200;
            responseConfig.headers = { 'content-type': $json.contentType() };

            const responseBody = $json.stringify({ ok: false, error: { message } } as JSONResponsePayload, { pretty: true });

            if (readableResponseStream && writableResponseStreamWriter && writableResponseProgress) {
                writableResponseProgress.complete = true; // Ends keep-alive chunks.

                await writableResponseStreamWriter.write($str.toBytes('\n' + responseBody));
                await writableResponseStreamWriter.close();

                responseConfig.body = readableResponseStream;
            } else {
                responseConfig.body = responseBody;
            }
            break;
        }
    }
};
