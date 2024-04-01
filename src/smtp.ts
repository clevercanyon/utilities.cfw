/**
 * SMTP utilities.
 */

import '#@initialize.ts';

import { $root, cfw } from '#index.ts';
import { $app, $env, $json, $obj, $str, $time, $to, type $type } from '@clevercanyon/utilities';

/**
 * Defines types.
 */
export type Data = {
    stream?: 'outbound' | 'broadcast';
    trackOpens?: boolean; // Requires `html` body.
    trackLinks?: boolean; // Requires `html` body.

    headers?: { [x: string]: string };
    tag?: string; // e.g., `contact-form`.

    from: string; // `user@hostname` or `"Name" <user@hostname>`.
    replyTo?: string | string[]; // `user@hostname` or `"Name" <user@hostname>`.

    to: string | string[]; // `user@hostname` or `"Name" <user@hostname>`.
    cc?: string | string[]; // `user@hostname` or `"Name" <user@hostname>`.
    bcc?: string | string[]; // `user@hostname` or `"Name" <user@hostname>`.

    subject: string; // e.g., `Thanks for your purchase.`.
    text?: string; // One or both of `text` & `html` body.
    html?: string; // One or both of `text` & `html` body.
};
export type SendOptions = Omit<Data, 'from'> & { from?: string };

export type RequestPayload = { data: Data };
export type ResponsePayload = $type.ReadonlyDeep<{
    ok: boolean;
    error?: { message: string };
}>;

/**
 * Sends an email message.
 *
 * @param   rcData  Request context data.
 * @param   options {@see SendOptions}.
 *
 * @returns         Promise of boolean `true` on success, else `false` on failure.
 */
export const send = async (rcData: $type.$cfw.RequestContextData, options: SendOptions): Promise<boolean> => {
    const { Request, AbortSignal } = cfw,
        { auditLogger } = rcData,
        //
        brand = $app.hasBrandProps() ? $app.brand() : undefined,
        opts = $obj.defaults({}, options, {
            from: brand ? $str.quote(brand.name, { type: 'double' }) + ' <' + brand.contacts.support.email + '>' : '',
        }) as SendOptions,
        //
        request = new Request('https://workers.hop.gdn/api/smtp/v1', {
            method: 'POST',
            headers: {
                'content-type': $json.contentType(),
                'authorization': $env.get('SSR_APP_ROOT_API_BEARER_TOKEN', { type: 'string', require: true }),
            },
            body: $json.stringify({ data: opts } as RequestPayload),
            signal: AbortSignal.timeout($time.secondInMilliseconds * 15),
        });
    return (
        $root
            .fetch(rcData, request)
            .then(async (response) => $to.plainObject(await response.json()) as ResponsePayload)
            .then((payload): boolean => (payload.ok ? true : false))
            //
            .catch((thrown: unknown): boolean => {
                void auditLogger.warn('SMTP send error.', { request, thrown });
                return false;
            })
    );
};
