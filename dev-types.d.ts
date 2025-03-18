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
 * @lastExtractedFrom `@cloudflare/workers-types/experimental/index.ts@4.20250224.0`
 * @lastExtractedFrom `@cloudflare/vitest-pool-workers@0.7.4`
 *
 * These are exact copies of ambient module types in `@cloudflare/workers-types/experimental/index.ts` and `@cloudflare/vitest-pool-workers`.
 * We extract them here because there is simply no other way to get at these, short of including the full set of Cloudflare types
 * globally and polluting global project types. The only changes from originals are related to whitespace formatting and also
 * that internal types referenced by these modules are prefixed with `cfw.` for proper scoping.
 */
declare module 'cloudflare:email' {
    /**
     * Imports Cloudflare types.
     */
    import * as cfw from '@cloudflare/workers-types/experimental/index.ts';

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
    import * as cfw from '@cloudflare/workers-types/experimental/index.ts';

    /**
     * Exports Cloudflare types.
     */
    export function connect(address: string | cfw.SocketAddress, options?: cfw.SocketOptions): cfw.Socket;
}
declare module 'cloudflare:workers' {
    /**
     * Imports Cloudflare types.
     */
    import * as cfw from '@cloudflare/workers-types/experimental/index.ts';

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
    export abstract class WorkflowEntrypoint<Env = unknown, T = unknown> implements cfw.Rpc.WorkflowEntrypointBranded {
        [cfw.Rpc.__WORKFLOW_ENTRYPOINT_BRAND]: never;
        protected ctx: cfw.ExecutionContext;
        protected env: Env;
        constructor(ctx: cfw.ExecutionContext, env: Env);
        run(event: Readonly<WorkflowEvent<T>>, step: WorkflowStep): Promise<unknown>;
    }
}
declare module 'cloudflare:workflows' {
    /**
     * Imports Cloudflare types.
     */
    // import * as cfw from '@cloudflare/workers-types/experimental/index.ts';

    /**
     * Exports Cloudflare types.
     */
    export class NonRetryableError extends Error {
        public constructor(message: string, name?: string);
    }
}
declare module 'cloudflare:test' {
    /**
     * Imports Cloudflare types.
     */
    import * as cfw from '@cloudflare/workers-types/experimental/index.ts';

    /**
     * Imports Cloudflare worker utilities.
     */
    import * as Rpc from 'cloudflare:workers';

    /**
     * Imports utilities.
     */
    import { $type } from '@clevercanyon/utilities';

    /**
     * Exports Cloudflare types.
     */
    export const env: ProvidedEnv;
    export const SELF: cfw.Fetcher;
    export const fetchMock: MockAgent;

    interface ProvidedEnv extends $type.$cfw.Environment {}

    export function runInDurableObject<O extends cfw.DurableObject | Rpc.DurableObject, R>(
        stub: cfw.DurableObjectStub<O>,
        callback: (instance: O, state: cfw.DurableObjectState) => R | Promise<R>,
    ): Promise<R>;

    export function runDurableObjectAlarm(stub: cfw.DurableObjectStub): Promise<boolean /* ran */>;
    export function listDurableObjectIds(namespace: cfw.DurableObjectNamespace): Promise<cfw.DurableObjectId[]>;

    export function createExecutionContext(): cfw.ExecutionContext;
    export function createPagesEventContext<F extends cfw.PagesFunction<ProvidedEnv, string, unknown>>(init: EventContextInit<Parameters<F>[0]>): Parameters<F>[0];
    export function waitOnExecutionContext(ctx: cfw.ExecutionContext | cfw.EventContext<ProvidedEnv, string, unknown>): Promise<void>;

    export function createScheduledController(options?: cfw.FetcherScheduledOptions): cfw.ScheduledController;
    export function createMessageBatch<Body = unknown>(queueName: string, messages: cfw.ServiceBindingQueueMessage<Body>[]): cfw.MessageBatch<Body>;
    export function getQueueResult(batch: cfw.MessageBatch, ctx: cfw.ExecutionContext): Promise<cfw.FetcherQueueResult>;

    export interface D1Migration {
        name: string;
        queries: string[];
    }
    export function applyD1Migrations(db: cfw.D1Database, migrations: D1Migration[], migrationsTableName?: string): Promise<void>;

    interface EventContextInitBase {
        request: cfw.Request<unknown, cfw.IncomingRequestCfProperties>;
        functionPath?: string;
        next?(request: cfw.Request): cfw.Response | Promise<cfw.Response>;
    }
    type EventContextInitParams<Params extends string> = [Params] extends [never] ? { params?: Record<string, never> } : { params: Record<Params, string | string[]> };
    type EventContextInitData<Data> = Data extends Record<string, never> ? { data?: Data } : { data: Data };
    type EventContextInit<E extends cfw.EventContext<unknown, unknown, unknown>> =
        E extends cfw.EventContext<unknown, infer Params, infer Data> ? EventContextInitBase & EventContextInitParams<Params> & EventContextInitData<Data> : never;

    type Buffer = Uint8Array;
    type IncomingHttpHeaders = Record<string, string | string[] | undefined>;

    abstract class MockScope<TData extends object = object> {
        delay(waitInMs: number): MockScope<TData>;
        persist(): MockScope<TData>;
        times(repeatTimes: number): MockScope<TData>;
    }
    abstract class MockInterceptor {
        reply<TData extends object = object>(replyOptionsCallback: MockInterceptor.MockReplyOptionsCallback<TData>): MockScope<TData>;
        reply<TData extends object = object>(
            statusCode: number,
            data?: TData | Buffer | string | MockInterceptor.MockResponseDataHandler<TData>,
            responseOptions?: MockInterceptor.MockResponseOptions,
        ): MockScope<TData>;
        replyWithError<TError extends Error = Error>(error: TError): MockScope;
        defaultReplyHeaders(headers: IncomingHttpHeaders): MockInterceptor;
        defaultReplyTrailers(trailers: Record<string, string>): MockInterceptor;
        replyContentLength(): MockInterceptor;
    }
    namespace MockInterceptor {
        export interface Options {
            path: string | RegExp | ((path: string) => boolean);
            method?: string | RegExp | ((method: string) => boolean);
            body?: string | RegExp | ((body: string) => boolean);
            headers?: Record<string, string | RegExp | ((body: string) => boolean)> | ((headers: Record<string, string>) => boolean);
            query?: Record<string, unknown>;
        }
        export interface MockDispatch<TData extends object = object, TError extends Error = Error> extends Options {
            times: number | null;
            persist: boolean;
            consumed: boolean;
            data: MockDispatchData<TData, TError>;
        }
        export interface MockDispatchData<TData extends object = object, TError extends Error = Error> extends MockResponseOptions {
            error: TError | null;
            statusCode?: number;
            data?: TData | string;
        }
        export interface MockResponseOptions {
            headers?: IncomingHttpHeaders;
            trailers?: Record<string, string>;
        }
        export interface MockResponseCallbackOptions {
            path: string;
            origin: string;
            method: string;
            body?: cfw.BodyInit;
            headers: Headers | Record<string, string>;
            maxRedirections: number;
        }
        export type MockResponseDataHandler<TData extends object = object> = (opts: MockResponseCallbackOptions) => TData | Buffer | string;
        export type MockReplyOptionsCallback<TData extends object = object> = (opts: MockResponseCallbackOptions) => {
            statusCode: number;
            data?: TData | Buffer | string;
            responseOptions?: MockResponseOptions;
        };
    }
    interface Interceptable {
        intercept(options: MockInterceptor.Options): MockInterceptor;
    }
    interface PendingInterceptor extends MockInterceptor.MockDispatch {
        origin: string;
    }
    interface PendingInterceptorsFormatter {
        format(pendingInterceptors: readonly PendingInterceptor[]): string;
    }
    abstract class MockAgent {
        get(origin: string | RegExp | ((origin: string) => boolean)): Interceptable;

        deactivate(): void;
        activate(): void;

        enableNetConnect(host?: string | RegExp | ((host: string) => boolean)): void;
        disableNetConnect(): void;

        pendingInterceptors(): PendingInterceptor[];
        assertNoPendingInterceptors(options?: { pendingInterceptorsFormatter?: PendingInterceptorsFormatter }): void;
    }
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
