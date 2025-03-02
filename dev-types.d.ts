/**
 * Typescript dev-only types config file.
 *
 * Typescript is aware of this config file's location.
 *
 * @note CUSTOM EDITS ONLY PLEASE!
 * @note In the future this file will be updated automatically.
 * @note Only `<custom:start.../custom:end>` will be preserved below.
 */

/**
 * Declares global scope.
 */
declare namespace globalThis {
    /**
     * Imports utilities.
     */
    import { $type } from '@clevercanyon/utilities';

    /**
     * Declares Vite global app constants.
     */
    const $$__APP_PKG_NAME__$$: string;
    const $$__APP_PKG_VERSION__$$: string;

    const $$__APP_BUILD_TIME_YMD__$$: string;
    const $$__APP_BUILD_TIME_SQL__$$: string;
    const $$__APP_BUILD_TIME_ISO__$$: string;
    const $$__APP_BUILD_TIME_STAMP__$$: string;

    const $$__APP_BASE_URL__$$: string;
    const $$__APP_BASE_URL_RESOLVED_NTS__$$: string;

    /**
     * Declares prefresh API in Vite plugin.
     */
    const __PREFRESH__: object;

    /**
     * Declares PWA install event, which we implement for SPAs.
     */
    var pwaInstallEvent: Event & { prompt: () => void };

    /**
     * Defines `c10n` on Request, etc.
     */
    // If request changes, please review {$http.requestHash()}.
    // If request changes, please review {$http.requestTypeIsCacheable()}.
    var Request: {
        prototype: Request;
        new (info: Request | URL | string, init?: RequestInit): Request;
    };
    interface Request {
        c10n?: $type.RequestC10nProps;
    }
    type RequestInfo = Request | URL | string;

    interface RequestInit {
        c10n?: $type.RequestC10nProps;
    }

    /**
     * Defines missing `entries()` on Headers.
     */
    interface Headers {
        entries(): IterableIterator<[key: string, value: string]>;
    }

    /**
     * Defines missing `entries()` on FormData.
     */
    interface FormData {
        entries(): IterableIterator<[key: string, value: string | Blob]>;
    }

    /**
     * Defines a typed cause on native error interface.
     */
    interface Error {
        cause?: $type.ErrorCause;
    }
}

/**
 * Declares virtual brand config module.
 */
declare module 'virtual:brand/config' {
    /**
     * Imports utilities.
     */
    import { $type } from '@clevercanyon/utilities';

    /**
     * Exports brand config.
     */
    export default {} as Partial<$type.BrandRawProps>;
}

/**
 * Declares extracted Cloudflare runtime modules.
 *
 * @lastExtractedFrom `@cloudflare/workers-types/experimental@4.20250224.0`
 *
 * These are exact copies from `@cloudflare/workers-types/experimental`. We extract because there is simply no other
 * way to get at them, short of including the full set of Cloudflare types globally and polluting global TypeScript types.
 * The only changes from originals are related to whitespace formatting, and that internal types referenced by these modules
 * are prefixed with `cfw.` for proper scoping, as they are pulled from `@cloudflare/workers-types` — see import atop this file.
 *
 * In addition to these ambient module declarations, we also have `@cloudflare/vitest-pool-workers` in our TypeScript config,
 * which provides an ambient module declaration for `cloudflare:test`, so we merely augment the existing declaration here.
 *
 * There are some others, such as `cloudflare:ai`, `cloudflare:br`, `cloudflare:vectorize`, for which we do not yet have types,
 * or that have since been deprecated by Cloudflare. Please review these when performing any future updates.
 */
declare module 'cloudflare:email' {
    /**
     * Imports Cloudflare types.
     */
    import * as cfw from '@cloudflare/workers-types/experimental';

    /**
     * Exports Cloudflare types.
     */
    export const EmailMessage: {
        prototype: cfw.EmailMessage;
        new (from: string, to: string, raw: cfw.ReadableStream | string): cfw.EmailMessage;
    };
}
declare module 'cloudflare:sockets' {
    /**
     * Imports Cloudflare types.
     */
    import * as cfw from '@cloudflare/workers-types/experimental';

    /**
     * Exports Cloudflare types.
     */
    export function connect(address: string | cfw.SocketAddress, options?: cfw.SocketOptions): cfw.Socket;
}
declare module 'cloudflare:workers' {
    /**
     * Imports Cloudflare types.
     */
    import * as cfw from '@cloudflare/workers-types/experimental';

    /**
     * Exports Cloudflare types.
     */
    export type RpcStub<T extends cfw.Rpc.Stubable> = cfw.Rpc.Stub<T>;
    export const RpcStub: {
        new <T extends cfw.Rpc.Stubable>(value: T): cfw.Rpc.Stub<T>;
    };
    export abstract class RpcTarget implements cfw.Rpc.RpcTargetBranded {
        [cfw.Rpc.__RPC_TARGET_BRAND]: never;
    }
    export abstract class WorkerEntrypoint<Env = unknown> implements cfw.Rpc.WorkerEntrypointBranded {
        [cfw.Rpc.__WORKER_ENTRYPOINT_BRAND]: never;
        protected ctx: cfw.ExecutionContext;
        protected env: Env;
        constructor(ctx: cfw.ExecutionContext, env: Env);
        fetch?(request: cfw.Request): cfw.Response | Promise<cfw.Response>;
        tail?(events: cfw.TraceItem[]): void | Promise<void>;
        trace?(traces: cfw.TraceItem[]): void | Promise<void>;
        scheduled?(controller: cfw.ScheduledController): void | Promise<void>;
        queue?(batch: cfw.MessageBatch<unknown>): void | Promise<void>;
        test?(controller: cfw.TestController): void | Promise<void>;
    }
    export abstract class DurableObject<Env = unknown> implements cfw.Rpc.DurableObjectBranded {
        [cfw.Rpc.__DURABLE_OBJECT_BRAND]: never;
        protected ctx: cfw.DurableObjectState;
        protected env: Env;
        constructor(ctx: cfw.DurableObjectState, env: Env);
        fetch?(request: cfw.Request): cfw.Response | Promise<cfw.Response>;
        alarm?(alarmInfo?: cfw.AlarmInvocationInfo): void | Promise<void>;
        webSocketMessage?(ws: cfw.WebSocket, message: string | ArrayBuffer): void | Promise<void>;
        webSocketClose?(ws: cfw.WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void>;
        webSocketError?(ws: cfw.WebSocket, error: unknown): void | Promise<void>;
    }
    export type WorkflowDurationLabel = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
    export type WorkflowSleepDuration = `${number} ${WorkflowDurationLabel}${'s' | ''}` | number;
    export type WorkflowDelayDuration = WorkflowSleepDuration;
    export type WorkflowTimeoutDuration = WorkflowSleepDuration;
    export type WorkflowBackoff = 'constant' | 'linear' | 'exponential';
    export type WorkflowStepConfig = {
        retries?: {
            limit: number;
            delay: WorkflowDelayDuration | number;
            backoff?: WorkflowBackoff;
        };
        timeout?: WorkflowTimeoutDuration | number;
    };
    export type WorkflowEvent<T> = {
        payload: Readonly<T>;
        timestamp: Date;
        instanceId: string;
    };
    export abstract class WorkflowStep {
        do<T extends cfw.Rpc.Serializable<T>>(name: string, callback: () => Promise<T>): Promise<T>;
        do<T extends cfw.Rpc.Serializable<T>>(name: string, config: WorkflowStepConfig, callback: () => Promise<T>): Promise<T>;
        sleep: (name: string, duration: WorkflowSleepDuration) => Promise<void>;
        sleepUntil: (name: string, timestamp: Date | number) => Promise<void>;
    }
    export abstract class WorkflowEntrypoint<Env = unknown, T extends cfw.Rpc.Serializable<T> | unknown = unknown> implements cfw.Rpc.WorkflowEntrypointBranded {
        [cfw.Rpc.__WORKFLOW_ENTRYPOINT_BRAND]: never;
        protected ctx: cfw.ExecutionContext;
        protected env: Env;
        constructor(ctx: cfw.ExecutionContext, env: Env);
        run(event: Readonly<WorkflowEvent<T>>, step: WorkflowStep): Promise<unknown>;
    }
}
declare module 'cloudflare:workflows' {
    /**
     * Exports Cloudflare types.
     */
    export class NonRetryableError extends Error {
        public constructor(message: string, name?: string);
    }
}
declare module 'cloudflare:test' {
    /**
     * Imports utilities.
     */
    import { $type } from '@clevercanyon/utilities';

    /**
     * Extends env provided by `@cloudflare/vitest-pool-workers`.
     */
    interface ProvidedEnv extends $type.$cfw.Environment {}
}

/*
 * Customizations.
 *
 * Declare project-wide dev-only types in this file, or add types using `./tsconfig.mjs`.
 * This file is best suited for project-wide dev-only types, while `./tsconfig.mjs`
 * is best when adding `@types/*` packages that your project depends on.
 *
 * WARNING: Please do not add types to this file arbitrarily. The types you add here will not be
 * included in `./dist` when your project is built; i.e., special types in this file are explicitly dev-only.
 *
 * For example, globals that exist prior to building your app, but definitely do not exist in `./dist`,
 * and therefore the types in this file are only relevant during development of *this* project.
 *
 * <custom:start> */

/* </custom:end> */
