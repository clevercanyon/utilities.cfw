/**
 * Test utilities.
 */

import '#@initialize.ts';

import { $cfw, cfw } from '#index.ts';
import { $app, $http, $json, type $type } from '@clevercanyon/utilities';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';

/**
 * Tests a function in a request context.
 *
 * @param fn Test function.
 */
export const rc = async (fn: (rcData: $cfw.RequestContextData) => Promise<unknown>) => {
    const { Request } = cfw,
        worker = {
            env: env,
            ctx: createExecutionContext(),
            request: new Request($app.baseURL(), {
                cf: { httpProtocol: 'HTTP/1.0' }, // An "incoming" request type.
            }),
            fetch: async (request: $type.cfw.Request, env: $cfw.Environment, ctx: $cfw.ExecutionContext): Promise<$type.cfw.Response> => {
                return $cfw.handleFetchEvent({
                    request,
                    env,
                    ctx,
                    routes: {
                        subpathGlobs: {
                            '**': async (rcData: $cfw.RequestContextData): Promise<$type.cfw.Response> => {
                                return $http.prepareResponse(
                                    rcData.request,
                                    await $http.responseConfig({
                                        enableCORs: false,
                                        cacheVersion: 'none',
                                        varyOn: [],

                                        status: 200,
                                        maxAge: 0,
                                        headers: { 'content-type': $json.contentType() },
                                        body: $json.stringify((await fn(rcData)) || {}),
                                    }),
                                ) as Promise<$type.cfw.Response>;
                            },
                        },
                    },
                });
            },
        };
    const response = await worker.fetch(worker.request, worker.env, worker.ctx);
    await waitOnExecutionContext(worker.ctx); // i.e., .waitUntil() calls.
    return response.json(); // Reads the response body.
};
