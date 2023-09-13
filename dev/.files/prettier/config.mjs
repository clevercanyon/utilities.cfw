/**
 * Prettier config file.
 *
 * Prettier is not aware of this config file's location.
 *
 * @note PLEASE DO NOT EDIT THIS FILE!
 * @note This entire file will be updated automatically.
 * @note Instead of editing here, please review <https://github.com/clevercanyon/skeleton>.
 *
 * @see https://prettier.io/docs/en/configuration.html
 */

import path from 'node:path';
import { $fs } from '../../../node_modules/@clevercanyon/utilities.node/dist/index.js';
import extensions from '../bin/includes/extensions.mjs';

const __dirname = $fs.imuDirname(import.meta.url);
const projDir = path.resolve(__dirname, '../../..');

/**
 * Defines Prettier configuration.
 */
export default async () => {
	/**
	 * Base config.
	 */
	const baseConfig = {
		/**
		 * Plugins.
		 */
		plugins: [
			// Misc. parsers.
			'prettier-plugin-sh',
			'prettier-plugin-ini',
			'prettier-plugin-sql',
			'@prettier/plugin-xml',
			'@prettier/plugin-php',
			'@prettier/plugin-ruby',
			'prettier-plugin-properties',

			// In this specific order...
			// See: <https://o5p.me/87sPJC>.
			'prettier-plugin-organize-imports',
			'prettier-plugin-jsdoc', // After organize imports.
			'prettier-plugin-tailwindcss', // Must come last, always.
		],

		/**
		 * Standard options.
		 */
		arrowParens: 'always',
		bracketSameLine: false,
		bracketSpacing: true,
		embeddedLanguageFormatting: 'auto',
		endOfLine: 'lf',
		htmlWhitespaceSensitivity: 'css',
		insertPragma: false,
		jsxSingleQuote: true,
		printWidth: 180,
		proseWrap: 'preserve',
		quoteProps: 'preserve',
		requirePragma: false,
		semi: true,
		singleAttributePerLine: false,
		singleQuote: true,
		tabWidth: 4,
		trailingComma: 'all',
		useTabs: true,
		vueIndentScriptAndStyle: true,
	};

	/**
	 * Composition.
	 */
	return {
		...baseConfig,

		overrides: [
			{
				/**
				 * Enforce JSON parser.
				 *
				 * @see https://o5p.me/sj8jjz
				 */
				files: ['*.' + extensions.asGlob(extensions.json)],
				options: {
					parser: 'json', // Not `json-stringify`.
				},
			},

			{
				/**
				 * JSDoc plugin options.
				 *
				 * @see https://o5p.me/dTTfse
				 */
				files: ['*.' + extensions.asGlob(extensions.jts)],
				options: {
					jsdocAddDefaultToDescription: false,
					jsdocCapitalizeDescription: true,
					jsdocDescriptionTag: false,
					jsdocDescriptionWithDot: true,
					jsdocKeepUnParseAbleExampleIndent: false,
					jsdocLineWrappingStyle: 'greedy',
					jsdocPreferCodeFences: false,
					jsdocPrintWidth: 120,
					jsdocSeparateReturnsFromParam: false,
					jsdocSeparateTagGroups: true,
					jsdocSingleLineComment: false,
					jsdocSpaces: 1,
					jsdocVerticalAlignment: true,
					tsdoc: false,
				},
			},

			{
				/**
				 * Organize import plugin options.
				 *
				 * @see https://o5p.me/o7OmDG
				 */
				files: ['*.' + extensions.asGlob(extensions.jts)],
				options: {
					organizeImportsSkipDestructiveCodeActions: true,
				},
			},

			{
				/**
				 * Tailwind CSS plugin options.
				 *
				 * @see https://o5p.me/RleCLk
				 */
				files: ['*.' + extensions.asGlob(extensions.content)],
				options: {
					tailwindConfig: path.resolve(projDir, './tailwind.config.mjs'),
					tailwindAttributes: ['class', 'classes', 'className', 'classNames'],
					tailwindFunctions: ['$preact.classes'], // See: <https://o5p.me/33VJpO>.
				},
			},

			{
				/**
				 * PHP plugin options.
				 *
				 * @see https://o5p.me/BHsZj8
				 */
				files: ['*.' + extensions.asGlob(extensions.php)],
				options: {
					parser: 'php',
					braceStyle: '1tbs',
					phpVersion: '8.1',
					trailingCommaPHP: true,
				},
			},

			{
				/**
				 * Ruby plugin options.
				 *
				 * @see https://o5p.me/tuKNvU
				 */
				files: ['*.' + extensions.asGlob(extensions.ruby)],
				options: {
					parser: 'ruby',
					rubyPlugins: '',
					rubySingleQuote: true,
				},
			},

			{
				/**
				 * SH plugin options.
				 *
				 * @see https://o5p.me/D0rlOV
				 */
				files: ['*.' + extensions.asGlob(extensions.bash), '{,*.}Dockerfile'],
				options: {
					parser: 'sh',
					binaryNextLine: false,
					experimentalWasm: false,
					functionNextLine: false,
					indent: 4,
					keepComments: true,
					keepPadding: false,
					minify: false,
					spaceRedirects: true,
					stopAt: undefined,
					switchCaseIndent: true,
					variant: 0, // Bash.
				},
			},

			{
				/**
				 * SQL plugin options.
				 *
				 * @see https://o5p.me/kYq5bx
				 */
				files: ['*.' + extensions.asGlob(extensions.sql)],
				options: {
					parser: 'sql',
					commaPosition: 'after',
					database: 'mysql',
					denseOperators: false,
					expressionWidth: 180,
					formatter: 'sql-formatter',
					indentStyle: 'standard',
					keywordCase: 'upper',
					language: 'sql',
					linesBetweenQueries: 1,
					logicalOperatorNewline: 'before',
					newlineBeforeSemicolon: false,
					params: Object,
					paramTypes: Object,
					tabulateAlias: false,
					type: 'table',
				},
			},

			{
				/**
				 * XML plugin options.
				 *
				 * @see https://o5p.me/OiLPzn
				 */
				files: ['*.' + extensions.asGlob(extensions.xml)],
				options: {
					parser: 'xml',
					xmlSelfClosingSpace: true,
					xmlSortAttributesByKey: false,
					xmlQuoteAttributes: 'preserve',
					xmlWhitespaceSensitivity: 'ignore',
				},
			},

			{
				/**
				 * INI plugin options.
				 *
				 * @see https://o5p.me/1fqazf
				 */
				files: ['*.' + extensions.asGlob(extensions.ini)],
				options: {
					parser: 'ini',
					iniSpaceAroundEquals: true,
				},
			},

			{
				/**
				 * Properties plugin options.
				 *
				 * @see https://o5p.me/IyzRSp
				 */
				files: ['*.' + extensions.asGlob(extensions.properties), '*.env{,.*}'],
				options: {
					parser: 'dot-properties',
					keySeparator: '=',
					escapeNonLatin1: false,
				},
			},

			{
				/**
				 * YAML spec options.
				 *
				 * @see https://o5p.me/jJH2xY
				 */
				files: ['*.' + extensions.asGlob(extensions.yaml)],
				options: {
					tabWidth: 2,
					useTabs: false,
				},
			},
		],
	};
};