/**
 * Vite config file.
 *
 * Vite is not aware of this config file's location.
 *
 * @note PLEASE DO NOT EDIT THIS FILE!
 * @note This entire file will be updated automatically.
 * @note Instead of editing here, please review <https://github.com/clevercanyon/skeleton>.
 *
 * @see https://vitejs.dev/config/
 */
/* eslint-env es2021, node */

import fs from 'node:fs';
import path from 'node:path';
import fsp from 'node:fs/promises';

import { loadEnv } from 'vite';
import pluginBasicSSL from '@vitejs/plugin-basic-ssl';
import { ViteEjsPlugin as pluginEJS } from 'vite-plugin-ejs';
import { ViteMinifyPlugin as pluginMinifyHTML } from 'vite-plugin-minify';

import * as preact from 'preact';
import u from '../bin/includes/utilities.mjs';
import importAliases from './includes/import-aliases.mjs';
import { $fs, $glob } from '../../../node_modules/@clevercanyon/utilities.node/dist/index.js';
import { $http as $cfpꓺhttp } from '../../../node_modules/@clevercanyon/utilities.cfp/dist/index.js';
import { $is, $str, $obj, $obp, $time } from '../../../node_modules/@clevercanyon/utilities/dist/index.js';

import { StandAlone as $preactꓺ404ꓺStandAlone } from '../../../node_modules/@clevercanyon/utilities/dist/preact/components/404.js';
import { renderToString as $preactꓺrenderToString } from '../../../node_modules/@clevercanyon/utilities/dist/preact/apis/ssr.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * Defines Vite configuration.
 *
 * @param   vite Data passed in by Vite.
 *
 * @returns      Vite configuration object properties.
 */
export default async ({ mode, command, ssrBuild: isSSRBuild }) => {
	/**
	 * Directory vars.
	 */
	const __dirname = $fs.imuDirname(import.meta.url);
	const projDir = path.resolve(__dirname, '../../..');

	const srcDir = path.resolve(__dirname, '../../../src');
	const cargoDir = path.resolve(__dirname, '../../../src/cargo');
	const distDir = path.resolve(__dirname, '../../../dist');

	const envsDir = path.resolve(__dirname, '../../../dev/.envs');
	const logsDir = path.resolve(__dirname, '../../../dev/.logs');

	// In the case of doing a secondary SSR build, we need to separate the SSR assets from the client-side assets.
	// The special folder `node_modules` was selected because it's ignored by Wrangler CLI; see <https://o5p.me/EqPjmv>.
	// Wrangler compiles all SSR assets (wherever they live) when it does it's own bundling of the `./dist` directory.
	const a16sDir = path.resolve(__dirname, '../../../dist' + (isSSRBuild ? '/node_modules' : '') + '/assets/a16s');

	/**
	 * Package-related vars.
	 */
	const pkg = await u.pkg(); // Parses current `./package.json` file.

	/**
	 * Sets node environment.
	 */
	process.env.NODE_ENV = 'dev' === mode ? 'development' : 'production'; // <https://o5p.me/DscTVM>.

	/**
	 * Environment-related vars.
	 */
	let appEnvPrefixes = ['APP_']; // Part of app.
	if (isSSRBuild) appEnvPrefixes.push('SSR_APP_');
	const env = loadEnv(mode, envsDir, appEnvPrefixes);

	const staticDefs = {
		['$$__' + appEnvPrefixes[0] + 'PKG_NAME__$$']: pkg.name || '',
		['$$__' + appEnvPrefixes[0] + 'PKG_VERSION__$$']: pkg.version || '',
		['$$__' + appEnvPrefixes[0] + 'PKG_REPOSITORY__$$']: pkg.repository || '',
		['$$__' + appEnvPrefixes[0] + 'PKG_HOMEPAGE__$$']: pkg.homepage || '',
		['$$__' + appEnvPrefixes[0] + 'PKG_BUGS__$$']: pkg.bugs || '',
	};
	staticDefs['$$__' + appEnvPrefixes[0] + 'BUILD_TIME_YMD__$$'] = $time.parse('now').toSQLDate() || '';

	Object.keys(env) // Add string env vars to static defines.
		.filter((key) => new RegExp('^(?:' + appEnvPrefixes.map((v) => $str.escRegExp(v)).join('|') + ')', 'u').test(key))
		.forEach((key) => ($is.string(env[key]) ? (staticDefs['$$__' + key + '__$$'] = env[key]) : null));

	/**
	 * App type, target, path, and related vars.
	 */
	const appBaseURL = env.APP_BASE_URL || ''; // e.g., `https://example.com/base`.
	const appBasePath = env.APP_BASE_PATH || ''; // e.g., `/base`.

	let appUMDName = (pkg.name || '').toLowerCase();
	appUMDName = appUMDName.replace(/\bclevercanyon\b/gu, 'c10n');
	appUMDName = appUMDName.replace(/@/gu, '').replace(/\./gu, '-').replace(/\/+/gu, '.');
	appUMDName = appUMDName.replace(/[^a-z.0-9]([^.])/gu, (m0, m1) => m1.toUpperCase());
	appUMDName = appUMDName.replace(/^\.|\.$/u, '');

	const appType = $obp.get(pkg, 'config.c10n.&.' + (isSSRBuild ? 'ssrBuild' : 'build') + '.appType') || 'cma';
	const targetEnv = $obp.get(pkg, 'config.c10n.&.' + (isSSRBuild ? 'ssrBuild' : 'build') + '.targetEnv') || 'any';
	const entryFiles = $obp.get(pkg, 'config.c10n.&.' + (isSSRBuild ? 'ssrBuild' : 'build') + '.entryFiles') || [];

	const appDefaultEntryFiles = ['spa'].includes(appType) ? ['./src/index.html'] : ['mpa'].includes(appType) ? ['./src/**/index.html'] : ['./src/*.{ts,tsx}'];
	const appEntryFiles = (entryFiles.length ? entryFiles : appDefaultEntryFiles).map((v) => $str.lTrim(v, './'));
	const appEntries = appEntryFiles.length ? await $glob.promise(appEntryFiles, { cwd: projDir }) : [];

	const appEntriesAsProjRelPaths = appEntries.map((absPath) => './' + path.relative(projDir, absPath));
	const appEntriesAsSrcSubpaths = appEntries.map((absPath) => path.relative(srcDir, absPath));
	const appEntriesAsSrcSubpathsNoExt = appEntriesAsSrcSubpaths.map((subpath) => subpath.replace(/\.[^.]+$/u, ''));

	/**
	 * Configuration data needed below.
	 */
	const useLibMode = ['cma', 'lib'].includes(appType);
	const peerDepKeys = Object.keys(pkg.peerDependencies || {});
	const targetEnvIsServer = ['cfw', 'node'].includes(targetEnv);
	const useMinifier = 'dev' !== mode && !['lib'].includes(appType);
	const preserveModules = ['lib'].includes(appType) && appEntries.length > 1;
	const useUMD = !isSSRBuild && !targetEnvIsServer && !preserveModules && !peerDepKeys.length && useLibMode && 1 === appEntries.length;

	/**
	 * Validates all of the above.
	 */
	if (!pkg.name || !appUMDName) {
		throw new Error('Apps must have a name.');
	}
	if (!appEntryFiles.length || !appEntries.length) {
		throw new Error('Apps must have at least one entry point.');
	}
	if (isSSRBuild && !targetEnvIsServer) {
		throw new Error('SSR builds must target an SSR environment.');
	}
	if (!['dev', 'ci', 'stage', 'prod'].includes(mode)) {
		throw new Error('Required `mode` is missing or invalid. Expecting `dev|ci|stage|prod`.');
	}
	if (!['spa', 'mpa', 'cma', 'lib'].includes(appType)) {
		throw new Error('Must have a valid `config.c10n.&.build.appType` in `package.json`.');
	}
	if (['spa', 'mpa'].includes(appType) && !appBaseURL) {
		throw new Error('Must have a valid `APP_BASE_URL` environment variable.');
	}
	if (!['any', 'node', 'cfw', 'cfp', 'web', 'webw'].includes(targetEnv)) {
		throw new Error('Must have a valid `config.c10n.&.build.targetEnv` in `package.json`.');
	}

	/**
	 * Prepares `package.json` build-related properties.
	 */
	const updatePkg = {}; // Initialize.

	if (isSSRBuild) {
		updatePkg.type = 'module'; // ESM; always.
		updatePkg.sideEffects = pkg.sideEffects || []; // <https://o5p.me/xVY39g>.
	} else {
		updatePkg.type = 'module'; // ESM; always.
		updatePkg.exports = {}; // Exports object initialization.
		updatePkg.sideEffects = []; // <https://o5p.me/xVY39g>.

		switch (true /* Conditional case handlers. */) {
			case ['spa', 'mpa'].includes(appType): {
				const appEntryIndexAsSrcSubpath = appEntriesAsSrcSubpaths.find((subpath) => $str.mm.isMatch(subpath, 'index.html'));
				const appEntryIndexAsSrcSubpathNoExt = appEntryIndexAsSrcSubpath.replace(/\.[^.]+$/u, '');

				if (['spa'].includes(appType) && (!appEntryIndexAsSrcSubpath || !appEntryIndexAsSrcSubpathNoExt)) {
					throw new Error('Single-page apps must have an `./index.html` entry point.');
					//
				} else if (['mpa'].includes(appType) && (!appEntryIndexAsSrcSubpath || !appEntryIndexAsSrcSubpathNoExt)) {
					throw new Error('Multipage apps must have an `./index.html` entry point.');
				}
				(updatePkg.exports = null), (updatePkg.typesVersions = {});
				updatePkg.module = updatePkg.main = updatePkg.browser = updatePkg.unpkg = updatePkg.types = '';

				break; // Stop here.
			}
			case ['cma', 'lib'].includes(appType): {
				const appEntryIndexAsSrcSubpath = appEntriesAsSrcSubpaths.find((subpath) => $str.mm.isMatch(subpath, 'index.{ts,tsx}'));
				const appEntryIndexAsSrcSubpathNoExt = appEntryIndexAsSrcSubpath.replace(/\.[^.]+$/u, '');

				if (['cma'].includes(appType) && (!appEntryIndexAsSrcSubpath || !appEntryIndexAsSrcSubpathNoExt)) {
					throw new Error('Custom apps must have an `./index.{ts,tsx}` entry point.');
					//
				} else if (['lib'].includes(appType) && (!appEntryIndexAsSrcSubpath || !appEntryIndexAsSrcSubpathNoExt)) {
					throw new Error('Library apps must have an `./index.{ts,tsx}` entry point.');
				}
				if (useUMD) {
					updatePkg.exports = {
						'.': {
							import: './dist/' + appEntryIndexAsSrcSubpathNoExt + '.js',
							require: './dist/' + appEntryIndexAsSrcSubpathNoExt + '.umd.cjs',
							types: './dist/types/' + appEntryIndexAsSrcSubpathNoExt + '.d.ts',
						},
					};
					updatePkg.module = './dist/' + appEntryIndexAsSrcSubpathNoExt + '.js';
					updatePkg.main = './dist/' + appEntryIndexAsSrcSubpathNoExt + '.umd.cjs';

					updatePkg.browser = ['web', 'webw'].includes(targetEnv) ? updatePkg.main : '';
					updatePkg.unpkg = updatePkg.main;

					updatePkg.types = './dist/types/' + appEntryIndexAsSrcSubpathNoExt + '.d.ts';
					updatePkg.typesVersions = { '>=3.1': { './*': ['./dist/types/*'] } };
				} else {
					updatePkg.exports = {
						'.': {
							import: './dist/' + appEntryIndexAsSrcSubpathNoExt + '.js',
							require: './dist/' + appEntryIndexAsSrcSubpathNoExt + '.cjs',
							types: './dist/types/' + appEntryIndexAsSrcSubpathNoExt + '.d.ts',
						},
					};
					updatePkg.module = './dist/' + appEntryIndexAsSrcSubpathNoExt + '.js';
					updatePkg.main = './dist/' + appEntryIndexAsSrcSubpathNoExt + '.cjs';

					updatePkg.browser = ['web', 'webw'].includes(targetEnv) ? updatePkg.module : '';
					updatePkg.unpkg = updatePkg.module;

					updatePkg.types = './dist/types/' + appEntryIndexAsSrcSubpathNoExt + '.d.ts';
					updatePkg.typesVersions = { '>=3.1': { './*': ['./dist/types/*'] } };

					for (const appEntryAsSrcSubpathNoExt of appEntriesAsSrcSubpathsNoExt) {
						if (appEntryAsSrcSubpathNoExt === appEntryIndexAsSrcSubpathNoExt) {
							continue; // Don't remap the entry index.
						}
						$obj.patchDeep(updatePkg.exports, {
							['./' + appEntryAsSrcSubpathNoExt]: {
								import: './dist/' + appEntryAsSrcSubpathNoExt + '.js',
								require: './dist/' + appEntryAsSrcSubpathNoExt + '.cjs',
								types: './dist/types/' + appEntryAsSrcSubpathNoExt + '.d.ts',
							},
						});
					}
				}
				break; // Stop here.
			}
			default: {
				throw new Error('Unexpected `appType`. Failed to update `./package.json` properties.');
			}
		}
		if (fs.existsSync(path.resolve(projDir, './src/resources/init-env.ts'))) {
			updatePkg.sideEffects.push('./src/resources/init-env.ts');
		}
	}
	for (const appEntryAsProjRelPath of appEntriesAsProjRelPaths) {
		updatePkg.sideEffects.push(appEntryAsProjRelPath.replace(/\.html$/gu, '.tsx'));
	}
	updatePkg.sideEffects = [...new Set(updatePkg.sideEffects)]; // Unique array.

	/**
	 * Pre-updates `package.json` properties impacting build process.
	 */
	if ('build' === command /* Only when building the app. */) {
		await u.updatePkg({ $set: { type: updatePkg.type, sideEffects: updatePkg.sideEffects } });
	}

	/**
	 * Configures plugins for Vite.
	 *
	 * @see https://github.com/vitejs/vite-plugin-basic-ssl
	 * @see https://github.com/trapcodeio/vite-plugin-ejs
	 * @see https://github.com/zhuweiyou/vite-plugin-minify
	 */
	const pluginBasicSSLConfig = pluginBasicSSL();

	const pluginEJSConfig = pluginEJS(
		{ $: { require, pkg, mode, env, projDir } },
		{
			ejs: /* <https://o5p.me/wGv5nM> */ {
				strict: true, // JS strict mode.
				async: true, // Support await in EJS files.

				delimiter: '?', // <https://o5p.me/Qwu3af>.
				localsName: '$', // Shorter name for `locals`.
				outputFunctionName: 'echo', // For output in scriptlets.

				root: [srcDir], // For includes with an absolute path.
				views: /* For includes with a relative path — includes utilities. */ [
					//
					path.resolve(srcDir, './resources/ejs-views'), // Our standard location for internal EJS views.
					path.resolve(srcDir, './cargo/assets/ejs-views'), // Our standard location for distributed EJS views.
				],
			},
		},
	);
	const pluginMinifyHTMLConfig = 'dev' === mode ? null : pluginMinifyHTML();

	const pluginC10NPostProcessConfig = ((postProcessed = false) => {
		return {
			name: 'vite-plugin-c10n-post-process',
			enforce: 'post', // After others on this hook.

			async closeBundle(/* Rollup hook. */) {
				if (postProcessed) return;
				postProcessed = true;

				/**
				 * Not during SSR builds.
				 */
				if (isSSRBuild) return;

				/**
				 * Updates `package.json`.
				 */
				if ('build' === command) {
					await u.updatePkg({ $set: updatePkg });
				}

				/**
				 * Copies `./.env.vault` to dist directory.
				 */
				if ('build' === command && fs.existsSync(path.resolve(projDir, './.env.vault'))) {
					await fsp.copyFile(path.resolve(projDir, './.env.vault'), path.resolve(distDir, './.env.vault'));
				}

				/**
				 * Generates typescript type declaration file(s).
				 */
				if ('build' === command /* Also does important type checking at build time. */) {
					await u.spawn('npx', ['tsc', '--emitDeclarationOnly']);
				}

				/**
				 * Deletes a few files that are not needed for apps running on Cloudflare Pages.
				 */
				if ('build' === command && ['spa', 'mpa'].includes(appType) && ['cfp'].includes(targetEnv)) {
					for (const fileOrDir of await $glob.promise(['types', '.env.vault', 'index.*'], { cwd: distDir, onlyFiles: false })) {
						await fsp.rm(fileOrDir, { force: true, recursive: true });
					}
				}

				/**
				 * Updates a few files that configure apps running on Cloudflare Pages.
				 */
				if ('build' === command && ['spa', 'mpa'].includes(appType) && ['cfp'].includes(targetEnv)) {
					for (const file of await $glob.promise(['_headers', '_redirects', '_routes.json', '404.html', 'robots.txt', 'sitemap.xml', 'sitemaps/**/*.xml'], {
						cwd: distDir,
					})) {
						const fileExt = $str.trim(path.extname(file), '.');
						const fileRelPath = path.relative(distDir, file);

						let fileContents = fs.readFileSync(file).toString(); // Reads file contents.

						for (const key of Object.keys(staticDefs) /* Replaces all static definition tokens. */) {
							fileContents = fileContents.replace(new RegExp($str.escRegExp(key), 'gu'), staticDefs[key]);
						}
						if (['_headers'].includes(fileRelPath)) {
							const cfpDefaultHeaders = $cfpꓺhttp.prepareDefaultHeaders({ appType, isC10n: env.APP_IS_C10N || false });
							fileContents = fileContents.replace('$$__APP_CFP_DEFAULT_HEADERS__$$', cfpDefaultHeaders);
						}
						if (['404.html'].includes(fileRelPath)) {
							const cfpDefault404 = '<!DOCTYPE html>' + $preactꓺrenderToString(preact.h($preactꓺ404ꓺStandAlone));
							fileContents = fileContents.replace('$$__APP_CFP_DEFAULT_404_HTML__$$', cfpDefault404);
						}
						if (['_headers', '_redirects', 'robots.txt'].includes(fileRelPath)) {
							fileContents = fileContents.replace(/^#[^\n]*\n/gmu, '');
							//
						} else if (['json'].includes(fileExt)) {
							fileContents = fileContents.replace(/\/\*[\s\S]*?\*\/\n?/gu, '');
							//
						} else if (['xml', 'html'].includes(fileExt)) {
							fileContents = fileContents.replace(/<!--[\s\S]*?-->\n?/gu, '');
						}
						fileContents = $str.trim(fileContents.replace(/\n{3,}/gu, '\n\n'));

						await fsp.writeFile(file, fileContents);
					}
				}

				/**
				 * Generates SSR build on-the-fly internally.
				 */
				if ('build' === command && $obp.get(pkg, 'config.c10n.&.ssrBuild.appType')) {
					await u.spawn('npx', ['vite', 'build', '--mode', mode, '--ssr']);
				}

				/**
				 * Generates a zip archive containing `./dist` directory.
				 */
				if ('build' === command) {
					const archive = $fs.archiver('zip', { zlib: { level: 9 } });
					archive.pipe(fs.createWriteStream(path.resolve(projDir, './.~dist.zip')));
					archive.directory(distDir + '/', false);
					await archive.finalize();
				}
			},
		};
	})();
	const plugins = [pluginBasicSSLConfig, pluginEJSConfig, pluginMinifyHTMLConfig, pluginC10NPostProcessConfig];
	const importedWorkerPlugins = []; // <https://vitejs.dev/guide/features.html#web-workers>.

	/**
	 * Configures esbuild for Vite.
	 *
	 * @see https://o5p.me/XOFuJp
	 */
	const esbuildConfig = {
		// See <https://o5p.me/Wk8Fm9>.
		jsx: 'automatic', // Matches TypeScript config.
		jsxImportSource: 'preact', // Matches TypeScript config.
		legalComments: 'none', // See <https://o5p.me/DZKXwX>.
	};

	/**
	 * Configures rollup for Vite.
	 *
	 * @see https://rollupjs.org/guide/en/#big-list-of-options
	 * @see https://vitejs.dev/config/build-options.html#build-rollupoptions
	 */
	const rollupEntryCounters = new Map(),
		rollupChunkCounters = new Map();

	const rollupConfig = {
		input: appEntries,

		external: [
			...peerDepKeys.map((k) => new RegExp('^' + $str.escRegExp(k) + '(?:$|[/?])')),
			'__STATIC_CONTENT_MANIFEST', // Cloudflare worker sites use this for static assets.
		],
		output: {
			interop: 'auto', // Matches TypeScript config.
			exports: 'named', // Matches TypeScript config.
			esModule: true, // Matches TypeScript config.

			extend: true, // i.e., UMD global `||` checks.
			noConflict: true, // Behaves the same as `jQuery.noConflict()`.
			compact: useMinifier, // Minify wrapper code generated by rollup?

			// By default, special chars in a path like `[[name]].js` get changed to `__name__.js`.
			// This prevents that by enforcing a custom sanitizer. See: <https://o5p.me/Y2fNf9> for details.
			sanitizeFileName: (fileName) => fileName.replace(/[\0?*]/gu, ''),

			// By default, in SSR mode, Vite forces all entry files into the distDir root.
			// This prevents that by enforcing a consistently relative location for all entries.
			entryFileNames: (entry) => {
				// This function doesn’t have access to the current output format, unfortunately.
				// However, we are setting `build.lib.formats` explicitly in the configuration below.
				// Therefore, we know `es` comes first, followed by either `umd` or `cjs` output entries.
				// So, entry counters make it possible to infer build output format, based on sequence.

				const entryKey = JSON.stringify(entry); // JSON serialization.
				const entryCounter = Number(rollupEntryCounters.get(entryKey) || 0) + 1;

				const entryFormat = entryCounter > 1 ? (useUMD ? 'umd' : 'cjs') : 'es';
				const entryExt = 'umd' === entryFormat ? 'umd.cjs' : 'cjs' === entryFormat ? 'cjs' : 'js';

				rollupEntryCounters.set(entryKey, entryCounter); // Updates counter.

				if ('.html' === path.extname(entry.facadeModuleId)) {
					if (/\//u.test(entry.name)) return '[name]-[hash].' + entryExt;
					return path.join(path.relative(distDir, a16sDir), '[name]-[hash].' + entryExt);
				}
				if (/\//u.test(entry.name)) return '[name].' + entryExt; // Already a subpath.
				return path.join(path.relative(srcDir, path.dirname(entry.facadeModuleId)), '[name].' + entryExt);
			},

			// By default, in library mode, Vite ignores `build.assetsDir`.
			// This prevents that by enforcing a consistent location for chunks and assets.
			chunkFileNames: (chunk) => {
				// This function doesn’t have access to the current output format, unfortunately.
				// However, we are setting `build.lib.formats` explicitly in the configuration below.
				// Therefore, we know `es` comes first, followed by either `umd` or `cjs` output chunks.
				// So, chunk counters make it possible to infer build output format, based on sequence.

				const chunkKey = JSON.stringify(chunk); // JSON serialization.
				const chunkCounter = Number(rollupChunkCounters.get(chunkKey) || 0) + 1;

				const chunkFormat = chunkCounter > 1 ? (useUMD ? 'umd' : 'cjs') : 'es';
				const chunkExt = 'umd' === chunkFormat ? 'umd.cjs' : 'cjs' === chunkFormat ? 'cjs' : 'js';

				rollupChunkCounters.set(chunkKey, chunkCounter); // Updates counter.
				return path.join(path.relative(distDir, a16sDir), '[name]-[hash].' + chunkExt);
			},
			assetFileNames: (/* asset */) => path.join(path.relative(distDir, a16sDir), '[name]-[hash].[ext]'),

			// Preserves module structure in apps built explicitly as multi-entry libraries.
			// The expectation is that its peers will build w/ this flag set as false, which is
			// recommended, because preserving module structure in a final build has performance costs.
			// However, in builds that are not final (e.g., apps with peer dependencies), preserving modules
			// has performance benefits, as it allows for tree-shaking optimization in final builds.
			...(preserveModules ? { preserveModules: true } : {}),

			// Cannot inline dynamic imports when `preserveModules` is enabled, so set as `false` explicitly.
			...(preserveModules ? { inlineDynamicImports: false } : {}),
		},
	};
	// <https://vitejs.dev/guide/features.html#web-workers>
	const importedWorkerRollupConfig = { ...$obj.omit(rollupConfig, ['input']) };

	/**
	 * Vitest config for Vite.
	 */
	const vitestExcludes = [
		'**/.*', //
		'**/dev/**',
		'**/dist/**',
		'**/.yarn/**',
		'**/vendor/**',
		'**/node_modules/**',
		'**/jspm_packages/**',
		'**/bower_components/**',
		'**/*.d.{ts,tsx,cts,ctsx,mts,mtsx}',
	];
	const vitestIncludes = [
		'**/*.{test,tests,spec,specs}.{js,jsx,cjs,cjsx,node,mjs,mjsx,ts,tsx,cts,ctsx,mts,mtsx}',
		'**/{test,tests,spec,specs,__test__,__tests__,__spec__,__specs__}/**/*.{js,jsx,cjs,cjsx,node,mjs,mjsx,ts,tsx,cts,ctsx,mts,mtsx}',
	];
	const vitestTypecheckIncludes = [
		'**/*.{test,tests,spec,specs}-d.{ts,tsx,cts,ctsx,mts,mtsx}', //
		'**/{test,tests,spec,specs,__test__,__tests__,__spec__,__specs__}/**/*-d.{ts,tsx,cts,ctsx,mts,mtsx}',
	];
	const vitestBenchIncludes = [
		'**/*.{bench,benchmark,benchmarks}.{js,jsx,cjs,cjsx,node,mjs,mjsx,ts,tsx,cts,ctsx,mts,mtsx}',
		'**/{bench,benchmark,benchmarks,__bench__,__benchmark__,__benchmarks__}/**/*.{js,jsx,cjs,cjsx,node,mjs,mjsx,ts,tsx,cts,ctsx,mts,mtsx}',
	];
	const vitestExtensions = ['.js', '.jsx', '.cjs', '.cjsx', '.json', '.node', '.mjs', '.mjsx', '.ts', '.tsx', '.cts', '.ctsx', '.mts', '.mtsx'];

	const vitestConfig = {
		root: srcDir,

		include: vitestIncludes,
		css: { include: /.+/u },

		exclude: vitestExcludes,
		watchExclude: vitestExcludes,

		// @todo Enhance web worker support.
		// @todo Fix and enhance miniflare support.
		environment: ['cfp', 'web', 'webw'].includes(targetEnv) ? 'jsdom' // <https://o5p.me/Gf9Cy5>.
			: ['cfw'].includes(targetEnv) ? 'miniflare' // <https://o5p.me/TyF9Ot>.
			: ['node'].includes(targetEnv) ? 'node' // <https://o5p.me/Gf9Cy5>.
			: 'node', // prettier-ignore

		// See: <https://o5p.me/8Pjw1d> for `environment`, `environmentMatchGlobs` precedence.
		environmentMatchGlobs: [
			['**/*.{cfp,web,webw}.{test,tests,spec,specs}.{' + vitestExtensions.map((e) => e.slice(1)).join(',') + '}', 'jsdom'],
			['**/*.cfw.{test,tests,spec,specs}.{' + vitestExtensions.map((e) => e.slice(1)).join(',') + '}', 'miniflare'],
			['**/*.node.{test,tests,spec,specs}.{' + vitestExtensions.map((e) => e.slice(1)).join(',') + '}', 'node'],
		],
		server: { deps: { external: ['**/dist/**', '**/node_modules/**'].concat(rollupConfig.external) } },
		cache: { dir: path.resolve(projDir, './node_modules/.vitest') },

		allowOnly: true, // Allows `describe.only`, `test.only`, `bench.only`.
		passWithNoTests: true, // Pass if there are no tests to run.

		watch: false, // Disable watching by default.
		forceRerunTriggers: ['**/package.json', '**/vitest.config.*', '**/vite.config.*'],

		reporters: ['verbose'], // Verbose reporting.
		outputFile: {
			json: path.resolve(logsDir, './tests/vitest.json'),
			junit: path.resolve(logsDir, './tests/vitest.junit'),
			html: path.resolve(logsDir, './tests/vitest/index.html'),
		},
		typecheck: {
			include: vitestTypecheckIncludes,
			exclude: vitestExcludes,
		},
		coverage: {
			all: true,
			include: ['**'],
			exclude: vitestExcludes //
				.concat(vitestIncludes)
				.concat(vitestTypecheckIncludes)
				.concat(vitestBenchIncludes),
			extension: vitestExtensions,
			reporter: ['text', 'html', 'clover', 'json'],
			reportsDirectory: path.resolve(logsDir, './coverage/vitest'),
		},
		benchmark: {
			include: vitestBenchIncludes,
			includeSource: vitestIncludes,
			exclude: vitestExcludes,

			outputFile: {
				json: path.resolve(logsDir, './benchmarks/vitest.json'),
				junit: path.resolve(logsDir, './benchmarks/vitest.junit'),
				html: path.resolve(logsDir, './benchmarks/vitest.html'),
			},
		},
	};

	/**
	 * Base config for Vite.
	 *
	 * @see https://vitejs.dev/config/
	 */
	const baseConfig = {
		c10n: { pkg, updatePkg },
		define: $obj.map(staticDefs, (v) => JSON.stringify(v)),

		root: srcDir, // Absolute. Where entry indexes live.
		publicDir: isSSRBuild ? false : path.relative(srcDir, cargoDir), // Relative to `root`.
		base: appBasePath + '/', // Analagous to `<base href="/">`; i.e., leading & trailing slash.

		appType: ['spa', 'mpa'].includes(appType) ? appType : 'custom', // See: <https://o5p.me/ZcTkEv>.
		resolve: { alias: importAliases }, // Matches TypeScript config import aliases.

		envDir: path.relative(srcDir, envsDir), // Relative to `root` directory.
		envPrefix: appEnvPrefixes, // Env vars w/ these prefixes become part of the app.

		server: { open: false, https: true }, // Vite dev server.
		plugins, // Additional Vite plugins that were configured above.

		...(targetEnvIsServer // Target environment is server-side?
			? {
					ssr: {
						noExternal: ['cfw'].includes(targetEnv),
						target: ['cfw'].includes(targetEnv) ? 'webworker' : 'node',
					},
			  }
			: {}),
		worker: /* <https://vitejs.dev/guide/features.html#web-workers> */ {
			format: 'es',
			plugins: importedWorkerPlugins,
			rollupOptions: importedWorkerRollupConfig,
		},
		build: /* <https://vitejs.dev/config/build-options.html> */ {
			target: 'es2021', // Matches TypeScript config.

			emptyOutDir: isSSRBuild ? false : true, // Not during SSR builds.
			outDir: path.relative(srcDir, distDir), // Relative to `root` directory.

			assetsInlineLimit: 0, // Disable entirely. Use import `?raw`, `?url`, etc.
			assetsDir: path.relative(distDir, a16sDir), // Relative to `outDir` directory.
			// Note: `a16s` is a numeronym for 'acquired resources'; i.e. via imports.

			ssr: targetEnvIsServer, // Target environment is server-side?

			manifest: !isSSRBuild, // Enables creation of manifest (for assets).
			sourcemap: 'dev' === mode, // Enables creation of sourcemaps (for debugging).

			minify: useMinifier ? 'esbuild' : false, // Minify userland code?
			modulePreload: false, // Disable. DOM injections conflict with our SPAs.

			...(useLibMode // Use library mode in Vite, with specific formats?
				? {
						lib: {
							name: appUMDName, // Name of UMD window global var.
							entry: appEntries, // Should match up with `rollupOptions.input`.
							formats: isSSRBuild ? ['es'] : useUMD ? ['es', 'umd'] : ['es', 'cjs'],
						},
				  }
				: {}),
			rollupOptions: rollupConfig, // See: <https://o5p.me/5Vupql>.
		},
		esbuild: esbuildConfig, // esBuild config options.
		test: vitestConfig, // Vitest configuration options.
	};

	/**
	 * Returns base config for Vite.
	 */
	return baseConfig;
};
