/**
 * Turnstile utilities.
 */

import '#@initialize.ts';

import { cfw } from '#index.ts';
import { $env, $to, $user, type $type } from '@clevercanyon/utilities';

/**
 * Verifies a Cloudflare turnstile response.
 *
 * @param   rcData    Request context data.
 * @param   turnstile Turnstile response token.
 *
 * @returns           True if turnstile can be verified by Cloudflare.
 */
export const verify = async (rcData: $type.$cfw.RequestContextData, turnstile: string): Promise<boolean> => {
    const { FormData } = cfw,
        { request, fetch, auditLogger } = rcData,
        formData = new FormData();

    formData.append('secret', $env.get('SSR_APP_TURNSTILE_SECRET_KEY', { type: 'string' }) || $env.get('APP_TURNSTILE_SECRET_KEY', { type: 'string' }));
    formData.append('remoteip', await $user.ip(request));
    formData.append('response', turnstile);

    return await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: formData })
        .then(async (response): Promise<$type.Object> => {
            return $to.plainObject(await response.json());
        })
        .then((response) => Boolean(response.success))
        .catch((thrown: unknown): boolean => {
            void auditLogger.warn('Turnstile verification error.', { thrown });
            return false;
        });
};
