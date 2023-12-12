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
 * Declares Vite global app constants.
 */
declare const $$__APP_PKG_NAME__$$: string;
declare const $$__APP_PKG_VERSION__$$: string;
declare const $$__APP_PKG_REPOSITORY__$$: string;
declare const $$__APP_PKG_HOMEPAGE__$$: string;
declare const $$__APP_PKG_BUGS__$$: string;
declare const $$__APP_BASE_URL__$$: string;
declare const $$__APP_BASE_URL_RESOLVED_NTS__$$: string;
declare const $$__APP_BUILD_TIME_YMD__$$: string;

/**
 * Declares prefresh API in Vite plugin.
 */
declare var __PREFRESH__: object;

/**
 * Declares virtual brand config file.
 */
declare module 'virtual:brand/config' {
    import { $type } from '@clevercanyon/utilities';
    export default {} as Partial<$type.BrandRawProps>;
}

/**
 * Defines missing `entries()` on FormData.
 */
interface FormData {
    entries(): IterableIterator<[key: string, value: string | Blob]>;
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
