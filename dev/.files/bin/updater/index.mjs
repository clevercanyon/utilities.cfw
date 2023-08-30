/**
 * Dotfiles updater.
 *
 * @note PLEASE DO NOT EDIT THIS FILE!
 * @note This entire file will be updated automatically.
 * @note Instead of editing here, please review <https://github.com/clevercanyon/skeleton>.
 */
/* eslint-env es2021, node */

import fs from 'node:fs';
import path from 'node:path';
import fsp from 'node:fs/promises';

import customRegexp from './data/custom-regexp.mjs';
import { $is, $str, $obj, $obp } from '../../../../node_modules/@clevercanyon/utilities/dist/index.js';
import { $fs, $cmd, $chalk, $prettier } from '../../../../node_modules/@clevercanyon/utilities.node/dist/index.js';

const { log } = console; // Shorter reference.

export default async ({ projDir }) => {
	/**
	 * Initializes vars.
	 */
	const __dirname = $fs.imuDirname(import.meta.url);
	const skeletonDir = path.resolve(__dirname, '../../../..');

	/**
	 * Gets current `./package.json`.
	 *
	 * @returns {object} Parsed `./package.json`.
	 */
	const getPkg = async () => {
		const pkgFile = path.resolve(projDir, './package.json');

		if (!fs.existsSync(pkgFile)) {
			throw new Error('updater.getPkg: Missing `./package.json`.');
		}
		const pkg = JSON.parse(fs.readFileSync(pkgFile).toString());

		if (!$is.plainObject(pkg)) {
			throw new Error('updater.getPkg: Unable to parse `./package.json`.');
		}
		return pkg;
	};

	/**
	 * Gets properties from `./package.json` file.
	 */
	const { pkgRepository, pkgDotfileLocks } = await (async () => {
		const pkg = await getPkg();
		const pkgRepository = pkg.repository || '';

		let pkgDotfileLocks = $obp.get(pkg, 'config.c10n.&.dotfiles.lock', []);
		pkgDotfileLocks = pkgDotfileLocks.map((relPath) => path.resolve(projDir, relPath));

		return { pkgRepository, pkgDotfileLocks };
	})();

	/**
	 * Tests `pkgRepository` against an `owner/repo` string.
	 *
	 * @param   {string}  ownerRepo An `owner/repo` string.
	 *
	 * @returns {boolean}           True if current package repo is `ownerRepo`.
	 */
	const isPkgRepo = async (ownerRepo) => {
		return new RegExp('[:/]' + $str.escRegExp(ownerRepo) + '(?:\\.git)?$', 'iu').test(pkgRepository);
	};

	/**
	 * Checks dotfile locks.
	 *
	 * @param   {string}  relPath Relative dotfile path.
	 *
	 * @returns {boolean}         True if relative path is locked by `package.json`.
	 */
	const isLocked = async (relPath) => {
		// Compares absolute paths to each other.
		const absPath = path.resolve(projDir, relPath);

		for (let i = 0; i < pkgDotfileLocks.length; i++) {
			if (absPath === pkgDotfileLocks[i]) {
				return true; // Locked 🔒.
			}
		}
		return false;
	};

	/**
	 * Updates immutable directories.
	 */
	for (const relPath of ['./dev/.files']) {
		await fsp.rm(path.resolve(projDir, relPath), { recursive: true, force: true });
		await fsp.mkdir(path.resolve(projDir, relPath), { recursive: true });
		await fsp.cp(path.resolve(skeletonDir, relPath), path.resolve(projDir, relPath), { recursive: true });
	}
	await fsp.chmod(path.resolve(projDir, './dev/.files/bin/envs.mjs'), 0o700);
	await fsp.chmod(path.resolve(projDir, './dev/.files/bin/install.mjs'), 0o700);
	await fsp.chmod(path.resolve(projDir, './dev/.files/bin/update.mjs'), 0o700);

	/**
	 * Updates semi-immutable dotfiles.
	 */
	for (const relPath of [
		'./.github/CODEOWNERS',
		'./.github/dependabot.yml',
		'./.github/workflows/ci.yml',
		'./.vscode/settings.json',
		'./.browserslistrc',
		'./.editorconfig',
		'./.eslintignore',
		'./.eslintrc.cjs',
		'./.gitattributes',
		'./.gitignore',
		'./.madrun.mjs',
		'./.npmignore',
		'./.npmrc',
		'./.postcssrc.cjs',
		'./.prettierignore',
		'./.prettierrc.cjs',
		'./.shellcheckrc',
		'./.stylelintrc.cjs',
		'./.tailwindrc.cjs',
		'./jest.config.mjs',
		'./tsconfig.d.ts',
		'./tsconfig.json',
		'./vite.config.mjs',
		'./wrangler.toml',
	]) {
		if (await isLocked(relPath)) {
			continue; // Locked 🔒.
		}
		let newFileContents = ''; // Initialize.

		if (fs.existsSync(path.resolve(projDir, relPath))) {
			const oldFileContents = (await fsp.readFile(path.resolve(projDir, relPath))).toString();
			const oldFileMatches = customRegexp.exec(oldFileContents); // See: `./data/custom-regexp.js`.
			const oldFileCustomCode = oldFileMatches ? oldFileMatches[2] : ''; // We'll preserve any custom code.
			newFileContents = (await fsp.readFile(path.resolve(skeletonDir, relPath))).toString().replace(customRegexp, ($_, $1, $2, $3) => $1 + oldFileCustomCode + $3);
		} else {
			newFileContents = (await fsp.readFile(path.resolve(skeletonDir, relPath))).toString();
		}
		await fsp.mkdir(path.dirname(path.resolve(projDir, relPath)), { recursive: true });
		await fsp.writeFile(path.resolve(projDir, relPath), newFileContents);
	}

	/**
	 * Adds up-to-date copies of missing mutable files.
	 */
	for (const relPath of [
		'./LICENSE.txt', //
		'./README.md',
	]) {
		if (await isLocked(relPath)) {
			continue; // Locked 🔒.
		}
		if (!fs.existsSync(path.resolve(projDir, relPath))) {
			await fsp.cp(path.resolve(skeletonDir, relPath), path.resolve(projDir, relPath));
		}
	}

	/**
	 * Adds and/or updates updateable JSON files.
	 */
	for (const relPath of [
		'./package.json', //
	]) {
		if (await isLocked(relPath)) {
			continue; // Locked 🔒.
		}
		if (!fs.existsSync(path.resolve(projDir, relPath))) {
			await fsp.cp(path.resolve(skeletonDir, relPath), path.resolve(projDir, relPath));
		}
		let json = JSON.parse((await fsp.readFile(path.resolve(projDir, relPath))).toString());
		const jsonUpdatesFile = path.resolve(skeletonDir, './dev/.files/bin/updater/data', relPath, './updates.json');

		if (!$is.plainObject(json)) {
			throw new Error('updater: Unable to parse `' + relPath + '`.');
		}
		if (fs.existsSync(jsonUpdatesFile)) {
			const jsonUpdates = JSON.parse((await fsp.readFile(jsonUpdatesFile)).toString());

			if (!$is.plainObject(jsonUpdates)) {
				throw new Error('updater: Unable to parse `' + jsonUpdatesFile + '`.');
			}
			if ('./package.json' === relPath && (await isPkgRepo('clevercanyon/dev-deps'))) {
				if (jsonUpdates.$ꓺdefaults?.['devDependenciesꓺ@clevercanyon/dev-deps']) {
					delete jsonUpdates.$ꓺdefaults['devDependenciesꓺ@clevercanyon/dev-deps'];
				}
				if ($is.array(jsonUpdates.$ꓺunset)) {
					jsonUpdates.$ꓺunset.push('devDependenciesꓺ@clevercanyon/dev-deps');
				} else {
					jsonUpdates.$ꓺunset = ['devDependenciesꓺ@clevercanyon/dev-deps'];
				}
			}
			$obj.patchDeep(json, jsonUpdates); // Potentially declarative ops.
			const prettierCfg = { ...(await $prettier.resolveConfig(path.resolve(projDir, relPath))), parser: 'json' };
			await fsp.writeFile(path.resolve(projDir, relPath), $prettier.format(JSON.stringify(json, null, 4), prettierCfg));
		}
	}

	/**
	 * Updates `@clevercanyon/dev-deps` in project dir.
	 */
	if (!(await isPkgRepo('clevercanyon/dev-deps'))) {
		log($chalk.green('Updating project to latest `@clevercanyon/dev-deps`.'));
		await $cmd.spawn('npm', ['udpate', '@clevercanyon/dev-deps'], { cwd: projDir });
	}
};
