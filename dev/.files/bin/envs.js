#!/usr/bin/env node
/**
 * Env CLI.
 *
 * @note PLEASE DO NOT EDIT THIS FILE!
 * @note This entire file will be updated automatically.
 * @note Instead of editing here, please review <https://github.com/clevercanyon/skeleton>.
 */
/* eslint-env es2021, node */

import fs from 'node:fs';
import path from 'node:path';
import { dirname } from 'desm';
import fsp from 'node:fs/promises';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import chalk from 'chalk';
import u from './includes/utilities.js';

u.propagateUserEnvVars(); // i.e., `USER_` env vars.

const __dirname = dirname(import.meta.url);
const projDir = path.resolve(__dirname, '../../..');

const { log } = console; // Shorter reference.

const envFiles = {
	main: path.resolve(projDir, './dev/.envs/.env'),
	dev: path.resolve(projDir, './dev/.envs/.env.dev'),
	ci: path.resolve(projDir, './dev/.envs/.env.ci'),
	stage: path.resolve(projDir, './dev/.envs/.env.stage'),
	prod: path.resolve(projDir, './dev/.envs/.env.prod'),
};
/**
 * NOTE: Most of these commands _must_ be performed interactively. Please review the Yargs configuration below for
 * further details. At this time, only the `decrypt` command is allowed noninteractively, and _only_ noninteractively.
 */

/**
 * Install command.
 */
class Install {
	/**
	 * Constructor.
	 */
	constructor(args) {
		this.args = args;
	}

	/**
	 * Runs CMD.
	 */
	async run() {
		if (this.args['new']) {
			await this.installNew();
		} else {
			await this.install();
		}
		if (this.args.dryRun) {
			log(chalk.cyanBright('Dry run. This was all a simulation.'));
		}
	}

	/**
	 * Runs new install.
	 */
	async installNew() {
		/**
		 * Displays preamble.
		 */

		log(chalk.green('Installing all new Dotenv Vault envs.'));

		/**
		 * Deletes old files so a new install can begin.
		 */

		log(chalk.gray('Deleting any existing `.env.me`, `.env.vault` files.'));
		if (!this.args.dryRun) {
			await fsp.rm(path.resolve(projDir, './.env.me'), { force: true });
			await fsp.rm(path.resolve(projDir, './.env.vault'), { force: true });
		}

		/**
		 * Logs the current user into Dotenv Vault.
		 */

		log(chalk.gray('Creating all new Dotenv Vault envs, which requires login.'));
		if (!this.args.dryRun) {
			await u.spawn('npx', ['dotenv-vault', 'new', '--yes']);
			await u.spawn('npx', ['dotenv-vault', 'login', '--yes']);
			await u.spawn('npx', ['dotenv-vault', 'open', '--yes']);
		}

		/**
		 * Pushes all envs to Dotenv Vault.
		 */

		log(chalk.gray('Pushing all envs to Dotenv Vault.'));
		await u.envsPush({ dryRun: this.args.dryRun });

		/**
		 * Encrypts all Dotenv Vault envs.
		 */

		log(chalk.gray('Building; i.e., encrypting, all Dotenv Vault envs.'));
		await u.envsEncrypt({ dryRun: this.args.dryRun });

		/**
		 * Signals completion with success.
		 */

		log(await u.finale('Success', 'Installation of new Dotenv Vault envs complete.'));
	}

	/**
	 * Runs install.
	 */
	async install() {
		/**
		 * Displays preamble.
		 */

		log(chalk.green('Installing all Dotenv Vault envs.'));

		/**
		 * Checks if project is an envs vault.
		 */

		if (!(await u.isEnvsVault())) {
			throw new Error('There are no Dotenv Vault envs to install.');
		}

		/**
		 * Ensures current user is logged into Dotenv Vault.
		 */

		if (!fs.existsSync(path.resolve(projDir, './.env.me'))) {
			log(chalk.gray('Installing all Dotenv Vault envs, which requires login.'));
			if (!this.args.dryRun) {
				await u.spawn('npx', ['dotenv-vault', 'login', '--yes']);
				await u.spawn('npx', ['dotenv-vault', 'open', '--yes']);
			}
		}

		/**
		 * Pulls all envs from Dotenv Vault.
		 */

		if (this.args.pull || !fs.existsSync(envFiles.main)) {
			log(chalk.gray('Pulling all envs from Dotenv Vault.'));
			await u.envsPull({ dryRun: this.args.dryRun });
		}

		/**
		 * Signals completion with success.
		 */

		log(await u.finale('Success', 'Installation of Dotenv Vault envs complete.'));
	}
}

/**
 * Push command.
 */
class Push {
	/**
	 * Constructor.
	 */
	constructor(args) {
		this.args = args;
	}

	/**
	 * Runs CMD.
	 */
	async run() {
		await this.push();

		if (this.args.dryRun) {
			log(chalk.cyanBright('Dry run. This was all a simulation.'));
		}
	}

	/**
	 * Runs push.
	 */
	async push() {
		/**
		 * Displays preamble.
		 */

		log(chalk.green('Pushing all envs to Dotenv Vault.'));

		/**
		 * Checks if project has a Dotenv Vault.
		 */

		if (!(await u.isEnvsVault())) {
			throw new Error('There are no Dotenv Vault envs to push.');
		}

		/**
		 * Pushes all envs to Dotenv Vault.
		 */

		await u.envsPush({ dryRun: this.args.dryRun });

		/**
		 * Signals completion with success.
		 */

		log(await u.finale('Success', 'Dotenv Vault pushing complete.'));
	}
}

/**
 * Pull command.
 */
class Pull {
	/**
	 * Constructor.
	 */
	constructor(args) {
		this.args = args;
	}

	/**
	 * Runs CMD.
	 */
	async run() {
		await this.pull();

		if (this.args.dryRun) {
			log(chalk.cyanBright('Dry run. This was all a simulation.'));
		}
	}

	/**
	 * Runs pull.
	 */
	async pull() {
		/**
		 * Displays preamble.
		 */

		log(chalk.green('Pulling all envs from Dotenv Vault.'));

		/**
		 * Checks if project has a Dotenv Vault.
		 */

		if (!(await u.isEnvsVault())) {
			throw new Error('There are no Dotenv Vault envs to pull.');
		}

		/**
		 * Pulls all envs from Dotenv Vault.
		 */

		await u.envsPull({ dryRun: this.args.dryRun });

		/**
		 * Signals completion with success.
		 */

		log(await u.finale('Success', 'Dotenv Vault pulling complete.'));
	}
}

/**
 * Keys command.
 */
class Keys {
	/**
	 * Constructor.
	 */
	constructor(args) {
		this.args = args;
	}

	/**
	 * Runs CMD.
	 */
	async run() {
		await this.keys();

		if (this.args.dryRun) {
			log(chalk.cyanBright('Dry run. This was all a simulation.'));
		}
	}

	/**
	 * Runs keys.
	 */
	async keys() {
		/**
		 * Displays preamble.
		 */

		log(chalk.green('Retrieving Dotenv Vault keys for all envs.'));

		/**
		 * Checks if project has a Dotenv Vault.
		 */

		if (!(await u.isEnvsVault())) {
			throw new Error('There are no Dotenv Vault keys to retrieve.');
		}

		/**
		 * Outputs all Dotenv Vault keys.
		 */

		await u.envsKeys({ dryRun: this.args.dryRun });

		/**
		 * Signals completion with success.
		 */

		log(await u.finale('Success', 'Copy Dotenv Vault env keys from list above.'));
	}
}

/**
 * Encrypt command.
 */
class Encrypt {
	/**
	 * Constructor.
	 */
	constructor(args) {
		this.args = args;
	}

	/**
	 * Runs CMD.
	 */
	async run() {
		await this.encrypt();

		if (this.args.dryRun) {
			log(chalk.cyanBright('Dry run. This was all a simulation.'));
		}
	}

	/**
	 * Runs encrypt.
	 */
	async encrypt() {
		/**
		 * Displays preamble.
		 */

		log(chalk.green('Building; i.e., encrypting all Dotenv Vault envs.'));

		/**
		 * Checks if project has a Dotenv Vault.
		 */

		if (!(await u.isEnvsVault())) {
			throw new Error('There are no Dotenv Vault envs to encrypt.');
		}

		/**
		 * Encrypts all Dotenv Vault envs.
		 */

		await u.envsEncrypt({ dryRun: this.args.dryRun });

		/**
		 * Signals completion with success.
		 */

		log(await u.finale('Success', 'Dotenv Vault encryption complete.'));
	}
}

/**
 * Decrypt command.
 */
class Decrypt {
	/**
	 * Constructor.
	 */
	constructor(args) {
		this.args = args;
	}

	/**
	 * Runs CMD.
	 */
	async run() {
		await this.decrypt();

		if (this.args.dryRun) {
			log(chalk.cyanBright('Dry run. This was all a simulation.'));
		}
	}

	/**
	 * Runs decrypt.
	 */
	async decrypt() {
		/**
		 * Displays preamble.
		 */

		log(chalk.green('Decrypting Dotenv Vault env(s).'));

		/**
		 * Checks if project has a Dotenv Vault.
		 */

		if (!(await u.isEnvsVault())) {
			throw new Error('There are no Dotenv Vault envs to decrypt.');
		}

		/**
		 * Decrypts all Dotenv Vault envs; i.e., extracts env files.
		 */

		await u.envsDecrypt({ keys: this.args.keys, dryRun: this.args.dryRun });

		/**
		 * Signals completion with success.
		 */

		log(await u.finale('Success', 'Dotenv Vault decryption complete.'));
	}
}

/**
 * Yargs CLI config. ⛵🏴‍☠
 *
 * @see http://yargs.js.org/docs/
 */
(async () => {
	await yargs(hideBin(process.argv))
		.command({
			command: 'install',
			desc: 'Installs all envs for dotenv vault.',
			builder: (yargs) => {
				yargs
					.options({
						'new': {
							type: 'boolean',
							requiresArg: false,
							demandOption: false,
							default: false,
							description: 'Perform a new (fresh) install?',
						},
						pull: {
							type: 'boolean',
							requiresArg: false,
							demandOption: false,
							default: false,
							description: // prettier-ignore
								'When not `--new`, pull latest envs from dotenv vault?' +
								' If not set explicitly, only pulls when main env is missing.' +
								' Note: This option has no effect when `--new` is given.',
						},
						dryRun: {
							type: 'boolean',
							requiresArg: false,
							demandOption: false,
							default: false,
							description: 'Dry run?',
						},
					})
					.check(async (/* args */) => {
						if (!(await u.isInteractive())) {
							throw new Error('This *must* be performed interactively.');
						}
						return true;
					});
			},
			handler: async (args) => {
				await new Install(args).run();
			},
		})
		.command({
			command: 'push',
			desc: 'Pushes all envs to dotenv vault.',
			builder: (yargs) => {
				yargs
					.options({
						dryRun: {
							type: 'boolean',
							requiresArg: false,
							demandOption: false,
							default: false,
							description: 'Dry run?',
						},
					})
					.check(async (/* args */) => {
						if (!(await u.isInteractive())) {
							throw new Error('This *must* be performed interactively.');
						}
						return true;
					});
			},
			handler: async (args) => {
				await new Push(args).run();
			},
		})
		.command({
			command: 'pull',
			desc: 'Pulls all envs from dotenv vault.',
			builder: (yargs) => {
				yargs
					.options({
						dryRun: {
							type: 'boolean',
							requiresArg: false,
							demandOption: false,
							default: false,
							description: 'Dry run?',
						},
					})
					.check(async (/* args */) => {
						if (!(await u.isInteractive())) {
							throw new Error('This *must* be performed interactively.');
						}
						return true;
					});
			},
			handler: async (args) => {
				await new Pull(args).run();
			},
		})
		.command({
			command: 'keys',
			desc: 'Retrieves decryption keys for all envs.',
			builder: (yargs) => {
				yargs
					.options({
						dryRun: {
							type: 'boolean',
							requiresArg: false,
							demandOption: false,
							default: false,
							description: 'Dry run?',
						},
					})
					.check(async (/* args */) => {
						if (!(await u.isInteractive())) {
							throw new Error('This *must* be performed interactively.');
						}
						return true;
					});
			},
			handler: async (args) => {
				await new Keys(args).run();
			},
		})
		.command({
			command: 'encrypt',
			desc: 'Encrypts all envs into `.env.vault`.',
			builder: (yargs) => {
				yargs
					.options({
						dryRun: {
							type: 'boolean',
							requiresArg: false,
							demandOption: false,
							default: false,
							description: 'Dry run?',
						},
					})
					.check(async (/* args */) => {
						if (!(await u.isInteractive())) {
							throw new Error('This *must* be performed interactively.');
						}
						return true;
					});
			},
			handler: async (args) => {
				await new Encrypt(args).run();
			},
		})
		.command({
			command: 'decrypt',
			desc: 'Decrypts `.env.vault` env(s) for the given key(s).',
			builder: (yargs) => {
				yargs
					.options({
						keys: {
							type: 'array',
							requiresArg: true,
							demandOption: true,
							default: [],
							description: 'To decrypt `.env.vault` env(s).',
						},
						dryRun: {
							type: 'boolean',
							requiresArg: false,
							demandOption: false,
							default: false,
							description: 'Dry run?',
						},
					})
					.check(async (/* args */) => {
						if (await u.isInteractive()) {
							throw new Error('This can *only* be performed noninteractively.');
						}
						return true;
					});
			},
			handler: async (args) => {
				await new Decrypt(args).run();
			},
		})
		.fail(async (message, error /* , yargs */) => {
			if (error?.stack && typeof error.stack === 'string') log(chalk.gray(error.stack));
			log(await u.error('Problem', error ? error.toString() : message || 'Unexpected unknown errror.'));
			process.exit(1);
		})
		.strict()
		.parse();
})();
