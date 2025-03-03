/**
 * Test utilities.
 */

import '#@initialize.ts';

import { $cfw, cfw } from '#index.ts';
import { $app, $http, type $type } from '@clevercanyon/utilities';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';

/**
 * Tests a function in a request context.
 *
 * @param fn Test function.
 */
export const rc = async (fn: (rcData: $cfw.RequestContextData) => Promise<void>) => {
    const { Request } = cfw,
        worker = {
            env: env,
            ctx: createExecutionContext(),
            request: new Request($app.hasBaseURL() ? $app.baseURL() : 'https://x.tld/'),
            //
            fetch: async (request: $type.cfw.Request, env: $cfw.Environment, ctx: $cfw.ExecutionContext): Promise<$type.cfw.Response> => {
                return $cfw.handleFetchEvent({
                    request,
                    env,
                    ctx,
                    routes: {
                        subpathGlobs: {
                            '*': async (rcData: $cfw.RequestContextData): Promise<$type.cfw.Response> => {
                                await fn(rcData);

                                return $http.prepareResponse(
                                    rcData.request,
                                    await $http.responseConfig({
                                        enableCORs: false,
                                        cacheVersion: 'none',
                                        varyOn: [],
                                        status: 200,
                                        maxAge: 0,
                                    }),
                                ) as Promise<$type.cfw.Response>;
                            },
                        },
                    },
                });
            },
        };
    await worker.fetch(worker.request, worker.env, worker.ctx);
    await waitOnExecutionContext(worker.ctx);
};
