/**
 * Wrangler settings file.
 *
 * Wrangler is not aware of this config file's location. We use the exports provided by this file to centralize a few
 * settings associated with Wrangler that are reused across various tools that integrate with Wrangler.
 *
 * @note PLEASE DO NOT EDIT THIS FILE!
 * @note This entire file will be updated automatically.
 * @note Instead of editing here, please review <https://github.com/clevercanyon/skeleton>.
 */

import os from 'node:os';
import path from 'node:path';
import { $fs } from '../../../node_modules/@clevercanyon/utilities.node/dist/index.js';
import { $app, $brand, $time } from '../../../node_modules/@clevercanyon/utilities/dist/index.js';
import extensions from '../bin/includes/extensions.mjs';
import u from '../bin/includes/utilities.mjs';

const __dirname = $fs.imuDirname(import.meta.url);
const projDir = path.resolve(__dirname, '../../..');
const distDir = path.resolve(__dirname, '../../../dist');

/**
 * Defines Wrangler settings.
 */
export default async () => {
    const pkg = await u.pkg();
    const pkgSlug = $app.pkgSlug(pkg.name);

    const o5pOrg = $brand.get('@jaswrks/o5p.org');
    const o5pMe = $brand.get('@jaswrks/o5p.me');
    const hop = $brand.get('@clevercanyon/hop.gdn');

    let brandHostname = hop.hostname;
    let brandDevZoneHostname = hop.org.n7m + '.workers.dev';
    let brandAccountId = 'f1176464a976947aa5665d989814a4b1';
    let brandSupportsLogpush = true; // Requires paid plan.

    if (/^workers-o5p-(?:org|me)(?:$|-)/u.test(pkgSlug)) {
        brandHostname = /^workers-o5p-org(?:$|-)/u.test(pkgSlug)
            ? o5pOrg.hostname // O5p.org brand hostname.
            : o5pMe.hostname; // O5p.me brand hostname.
        brandDevZoneHostname = 'j5s' + '.workers.dev';
        brandAccountId = '4cf0983a5f62681776b3bc8a8e35b104';
        brandSupportsLogpush = false; // Requires paid plan.
    }
    return {
        // Compatibility.

        compatibilityDate: '2025-02-14', // ^ Most recent, as of 2025-03-01.
        compatibilityFlags: ['nodejs_compat'], // Adds support for `node:*` modules.

        // Workers & pages.

        defaultAccountId: brandAccountId,
        defaultSendMetricsEnable: false,
        defaultCPULimitTime: $time.secondInMilliseconds * 5,
        defaultPlacementMode: 'off',
        defaultDevLogLevel: 'error',

        defaultLocalIP: '0.0.0.0',
        defaultLocalHostname: 'localhost',
        defaultLocalPort: '443',
        defaultLocalProtocol: 'https',
        defaultUpstreamProtocol: 'https',

        // Workers.

        defaultWorkersDevEnable: false,
        defaultWorkersDevPreviewURLsEnable: false,

        defaultWorkerObservabilityEnabled: true,
        defaultWorkerObservabilityHeadSamplingRate: 1,
        defaultWorkerLogpush: brandSupportsLogpush,

        defaultWorkerZoneName: brandHostname,
        defaultWorkersDevZoneName: brandDevZoneHostname,
        defaultWorkersDomain: 'workers.' + brandHostname,

        defaultWorkerName: pkgSlug, // e.g., `workers-hop-gdn-utilities`.
        defaultWorkerShortName: pkgSlug.replace(/^workers-(?:o5p-(?:org|me)|hop-gdn)-/iu, ''),
        defaultWorkerStageShortName: 'stage.' + pkgSlug.replace(/^workers-(?:o5p-(?:org|me)|hop-gdn)-/iu, ''),

        defaultWorkerMainEntryFile: path.resolve(distDir, './index.js'),
        // Bundling rules; {@see <https://o5p.me/JRHxfC>}.
        defaultWorkerRules: [
            {
                type: 'ESModule',
                globs: extensions.asNoBraceGlobstars([
                    ...extensions.byDevGroup.sJavaScript, //
                    ...extensions.byDevGroup.sJavaScriptReact,

                    ...extensions.byDevGroup.mJavaScript,
                    ...extensions.byDevGroup.mJavaScriptReact,
                ]),
                fallthrough: false,
            },
            {
                type: 'CommonJS',
                globs: extensions.asNoBraceGlobstars([
                    ...extensions.byDevGroup.cJavaScript, //
                    ...extensions.byDevGroup.cJavaScriptReact,
                ]),
                fallthrough: false,
            },
            {
                type: 'CompiledWasm', //
                globs: extensions.asNoBraceGlobstars([
                    ...extensions.byCanonical.wasm, //
                ]),
                fallthrough: false,
            },
            {
                type: 'Text',
                globs: extensions.asNoBraceGlobstars(
                    [...extensions.byVSCodeLang.codeTextual].filter(
                        (ext) =>
                            ![
                                ...extensions.byDevGroup.sJavaScript, //
                                ...extensions.byDevGroup.sJavaScriptReact,

                                ...extensions.byDevGroup.mJavaScript,
                                ...extensions.byDevGroup.mJavaScriptReact,

                                ...extensions.byDevGroup.cJavaScript,
                                ...extensions.byDevGroup.cJavaScriptReact,

                                ...extensions.byCanonical.wasm,

                                ...extensions.byDevGroup.allTypeScript,
                                // Omit TypeScript also, because it causes Wrangler to choke. Apparently, Wrangler’s build system incorporates TypeScript middleware files.
                                // Therefore, we omit all TypeScript such that Wrangler’s build system can add TS files without them inadvertently being classified as text by our rules.
                                // We don’t expect TypeScript to be present in our `./dist` anyway, so this is harmless, and probably a good idea in general to omit TypeScript here.
                            ].includes(ext),
                    ),
                ),
                fallthrough: false,
            },
            {
                type: 'Data',
                globs: extensions.asNoBraceGlobstars(
                    [...extensions.byVSCodeLang.codeTextBinary].filter(
                        (ext) =>
                            ![
                                ...extensions.byDevGroup.sJavaScript, //
                                ...extensions.byDevGroup.sJavaScriptReact,

                                ...extensions.byDevGroup.mJavaScript,
                                ...extensions.byDevGroup.mJavaScriptReact,

                                ...extensions.byDevGroup.cJavaScript,
                                ...extensions.byDevGroup.cJavaScriptReact,

                                ...extensions.byCanonical.wasm,

                                ...extensions.byDevGroup.allTypeScript,
                            ].includes(ext),
                    ),
                ),
                fallthrough: false,
            },
        ],
        // Pages.

        defaultPagesZoneName: brandHostname,
        defaultPagesDevZoneName: 'pages.dev',

        defaultPagesProjectName: pkgSlug,
        defaultPagesProjectShortName: pkgSlug //
            .replace(/-(?:o5p-(?:org|me)|hop-gdn|com|net|org|gdn|me)$/iu, ''),

        defaultPagesProductionBranch: 'production',
        defaultPagesProjectStageBranchName: 'stage',
        defaultPagesProductionEnvironment: 'production',

        defaultPagesAssetsDir: distDir,
        defaultPagesBuildOutputDir: distDir,
        defaultPagesUploadSourceMaps: true,

        // Other.

        osDir: path.resolve(os.homedir(), './.wrangler'),
        projDir: path.resolve(projDir, './.wrangler'),
        projStateDir: path.resolve(projDir, './.wrangler/state'),

        osSSLCertDir: path.resolve(os.homedir(), './.wrangler/local-cert'),
        osSSLKeyFile: path.resolve(os.homedir(), './.wrangler/local-cert/key.pem'),
        osSSLCertFile: path.resolve(os.homedir(), './.wrangler/local-cert/cert.pem'),

        customSSLKeyFile: path.resolve(projDir, './dev/.files/bin/ssl-certs/i10e-ca-key.pem'),
        customSSLCertFile: path.resolve(projDir, './dev/.files/bin/ssl-certs/i10e-ca-crt.pem'),

        runtimeModules: ['cloudflare:email', 'cloudflare:sockets', 'cloudflare:workers', 'cloudflare:workflows'],
        virtualModules: ['cloudflare:test'], // It is loaded by `@cloudflare/vitest-pool-workers`.
    };
};
