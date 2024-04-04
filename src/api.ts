/**
 * API utilities.
 */

import '#@initialize.ts';

import { $error, $http, $is, $json, $obj, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type JSONResponsePayload<Type extends object = object> = $type.ReadonlyDeep<{
    ok: boolean;
    error?: { message: string };
    data?: Type;
}>;
export type CatchThrownOptions = {
    responseType: 'none' | 'json';
    responseConfig: $http.ResponseConfig;

    thrown: unknown;
    expectedCauses: string[];
};

/**
 * Catches an error thrown by an API.
 *
 * @param rcData  Request context data.
 * @param thrown  Thrown; e.g., error, response.
 * @param options {@see CatchThrownOptions}.
 */
export const catchThrown = async (rcData: $type.$cfw.RequestContextData, thrown: unknown, options: CatchThrownOptions): Promise<void> => {
    if ($is.response(thrown)) throw thrown;

    const { auditLogger } = rcData,
        opts = $obj.defaults({}, options) as Required<CatchThrownOptions>,
        { responseType, responseConfig, expectedCauses } = opts;

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

    responseConfig.cacheVersion = 'none';
    responseConfig.varyOn = [];

    responseConfig.headers = {};
    responseConfig.appendHeaders = {};

    responseConfig.body = undefined;
    responseConfig.encodeBody = undefined;

    switch (responseType) {
        case 'json': {
            responseConfig.status = 200;
            responseConfig.headers = { 'content-type': $json.contentType() };
            responseConfig.body = $json.stringify({ ok: false, error: { message } } as JSONResponsePayload, { pretty: true });
            break;
        }
    }
};
