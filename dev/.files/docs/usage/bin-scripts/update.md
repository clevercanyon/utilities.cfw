# `$ madrun update:*`

<small>Underlying bin script: `./dev/.files/bin/update.js`</small>

All updates _must_ be performed interactively.

## Updates Dotfiles

```bash
$ madrun update:dotfiles
```

See Also: [Prerequisites](./prerequisites.md)

-   When run inside the `@clevercanyon/skeleton` project, any pending changes will be added, committed, and pushed to the remote git origin. This is done to avoid a devastating loss of all changes prior to a self-update in the `@clevercanyon/skeleton`. Also, the current commit SHA must be in sync with that of the remote origin; i.e., not ahead of or behind the remote origin.

-   It then downloads, or pulls from cache, the latest `@clevercanyon/skeleton` containing our primary copy of `./dev/.files` and the accompanying project dotfiles found in the `main` branch of `@clevercanyon/skeleton`. However, in the case of being run inside the `@clevercanyon/skeleton` project (i.e., a self-update scenario), then it is the _current_ branch that we pull for a self-update. Otherwise, the `main` branch is pulled as per usual.

-   Runs a full dotfiles update using a copy of the latest `./dev/.files/bin/updater/index.js` from `@clevercanyon/skeleton`. This will update the entire `./dev/.files` directory and process updates across all the accompanying project dotfiles found in the `@clevercanyon/skeleton` project directory. Any `<custom:start></custom:end>` sections in your project will be preserved.

-   A few properties in `./package.json` will be reset to their expected and necessary values during the update. For a detailed look at which `./package.json` properties you should never change (or they'll be lost during a dotfiles update), please review `./dev/.files/bin/updater/data/package.json/updates.json`.

    These are the properties you should not update manually.

    ```json
    "author": {},
    "funding": "",
    "cpu": [],
    "os": [],
    "engines": {},
    "workspaces": [],
    "scripts": {},
    ```

    Additionally, when running the `$ madrun update:project` script, the following `./package.json` properties will also be automatically updated to match your project build configuration. Therefore, you should never change any of these manually, either, as those changes would be lost during a project update.

    ```json
    "type": "",
    "files": [],
    "exports": [],
    "sideEffects": [],
    "module": "",
    "main": "",
    "browser": "",
    "unpkg": "",
    "types": "",
    "typesVersions": {}
    ```

## Updates Dotfiles + Project

```bash
$ madrun update:project
```

-   Updates dotfiles (see details above).
-   Runs `npm update --save`, to update the project’s NPM packages.
-   If it's a GitHub repository and this script is run by a GitHub repository admin, the remote origin at GitHub is configured automatically using org-wide standards established by Clever Canyon for GitHub repositories. For example; GitHub wikis, issues, projects, discussions, and downloads are all enabled. Repo security settings are configured, the `main` branch is protected, and the appropriate teams are added/removed from the repository. GitHub repository admins can configure repo team access using `package.json` by setting `config.c10n.&.github.teams`.
-   If a Dotenv Vault is present; the `.env.vault` is re-encrypted to reflect any `./dev/.envs/.env*` file changes.
-   Updates the project build (`--mode=prod`), which is located in the `./dist` directory.

## Updates Dotfiles + Project + Repos

```bash
$ madrun update:project --repos
```

-   Updates dotfiles (see details above).
-   If `--pkgs` is also set and it's an NPM package in a publishable branch/state, the `--repos` update also performs a version incrementation with the expectation that a rebuild is about to occur, which needs the bumped version.
-   Also updates project (see details above), which includes a project rebuild using an incremented version if `--pkgs` is also set, as outlined in the previous bullet point. Only applies if `--pkgs` is set in addition to `--repos`. Not that `--pkgs` only has an effect when accompanied by `--repos`.
-   If it's a Dotenv Vault; pushes current copy of all envs to remote vault.
    -   If it's a GitHub repository and this script is run by a GitHub repository admin, when environments are pushed, the remote GitHub origin is updated as well. GitHub repository deployment environments are created/removed appropriately to match standards established by Clever Canyon for GitHub repositories. Additionally, Dotenv Valult secret keys are extracted and configured for each GitHub repository environment, and a `prod` deployment policy is created; i.e., only the `main` branch can be deployed to the `prod` environment on GitHub.
-   If it's a git repo; adds, commits, and pushes to current branch.

## Updates Dotfiles + Project + Repos + Pkgs

```bash
$ madrun update:project --repos --pkgs
```

-   Updates dotfiles (see details above).
-   Also updates project (see details above).
-   If it's an NPM package in a publishable branch/state, this runs `npm publish`, effectively deploying the updated package, with an incremented version, to the NPM registry just prior to the the Git push that occurs in the repos update phase.
    -   If it's a git repo, an annotated git tag is created and committed; which occurs after `npm publish` is complete. Additionally, if it's a GitHub repository, a release is generated at GitHub that points to the tagged commit and includes a copy of `./dist` in zip format. This is purely for archival purposes, but might be used for something more in the future.
    -   When a publish occurs, if the registry is npmjs, and this script is run by an npmjs package admin, the remote package origin is updated as well. npmjs teams are added/removed appropriately reflecting standards established by Clever Canyon for npmjs packages. Package admins can configure team access using `package.json` by setting `config.c10n.&.npmjs.teams`. If not set, team access defaults to a reflection of `config.c10n.&.github.teams`.
-   Also updates project repos (see details above).

## Help

```bash
$ madrun update --help
```

## Updating Multiple Projects

When updating multiple projects, the `./update.js` script simply steps up one directory level and looks for sibling project directories with a customizable set of glob and ignore patterns, as described below. After globbing, matched project directories, or deeper, can be updated all in a single command, saving an enormous amount of time. A bit scary at first, but massive productivity, _woohoo_!

### Recommended Project Directory Tree Structure

```text
~/Projects/clevercanyon
 - forks
   - micromatch.fork
   - ...etc.
 - my-new-project
 - madrun
 - skeleton-dev-deps
 - skeleton
 - skeleton.cma.web
 - utilities
 - utilities.node
 - utilities.web
 - ... etc.
```

With this structure, all `clevercanyon` projects are together. If you are working in the `my-new-project` directory and do an `$ madrun update:projects --run update:dotfiles`, the script steps up one directory to `~/Projects/clevercanyon` where it globs for siblings. In the matching directories, it updates each of their dotfiles.

By default, the glob pattern is `*`, matching all direct siblings.

If any of the glob patterns is set to a single `*` (as in the default case), scripts are only run if the project directory contains a `./dev/.files` directory and a `./package.json` file.

However, when the glob pattern is set to something else other than `*`, you must be sure of what you're doing, because the restriction is no longer applied and all scripts and/or custom commands will run as requested with no requirement that a project contain a `./dev/.files` directory. For this reason it is strongly suggested that you do a `--dryRun` and review carefully before removing `--dryRun` and running for real. Massive productivity can turn into massive cleanup if you're not careful!

<small>_**Note:** All of the examples below end with `--dryRun`. Remove the flag when running for real._</small>

### Updates Dotfiles

```bash
$ madrun update:projects --run update:dotfiles --dryRun
```

-   Updates dotfiles in all matching directories (see details above).

### Updates Dotfiles + Project

```bash
$ madrun update:projects --run update:project --dryRun
```

-   Updates dotfiles in all matching directories (see details above).
-   Also updates project in all matching directories (see details above).

### Updates Dotfiles + Project + Repos

```bash
$ madrun update:projects --run 'update:project --repos' --dryRun
```

-   Updates dotfiles in all matching directories (see details above).
-   Also updates project in all matching directories (see details above).
-   Also updates project repos in all matching directories (see details above).

### Updates Dotfiles + Project + Repos + Pkgs

```bash
$ madrun update:projects --run 'update:project --repos --pkgs' --dryRun
```

-   Updates dotfiles in all matching directories (see details above).
-   Also updates project in all matching directories (see details above).
-   Also updates project repos in all matching directories (see details above).
-   Also updates packages in all matching directories (see details above).

### Updates Projects by Running a Custom Command

```bash
$ madrun update:projects --cmd 'git checkout main' --dryRun
```

### Updates Projects by Running Multiple Scripts

```bash
$ madrun update:projects --run script:one script:two script:three --dryRun
```

### Updates w/ Custom Globs and Ignores

You can pass more than a single glob pattern, and more than a single ignore pattern. Also, you can combine `--cmd` with `--run`. Note: `--cmd` always runs first, no matter what order you pass the options in.

```bash
$ madrun update:projects \
	--glob 'foo-*' --ignore 'foo-{utils,addons}' \
	--cmd 'git add --all && git commit -m "Message" && git push && git checkout main' \
	--run script:one script:two script:three \
	--dryRun
```

```bash
$ madrun update:projects \
	--glob 'foo' 'bar-{two,three,four}' 'baz-*-utils' \
	--ignore 'baz-foo-utils' 'baz-bar-utils' \
	--cmd 'git add --all && git commit -m "Message" && git push && git checkout main' \
	--run script:one script:two script:three \
	--dryRun
```

### A Few Tips Regarding Custom Commands and Scripts

If you need more control over command sequence, consider using _only_ a custom CMD.

```bash
# Tip: Save repeated commands in a variable.
$ gitACP='git add --all && git commit -m "Message" && git push'

$ cmd="${gitACP}" # Commit and push changes before starting.
$ cmd+=' && git checkout main && npm run script:one && '"${gitACP}"
$ cmd+=' && git checkout dev && npm run script:one && '"${gitACP}"

$ madrun update:projects \
	--glob 'foo' 'bar-{two,three,four}' 'baz-*-utils' \
	--ignore 'baz-foo-utils' 'baz-bar-utils' \
	--cmd '"${cmd}"' \
	--dryRun
```

If you need more control over project directory sequence, consider using the `--order` option.

> `--order`: Project subpaths to prioritize, in order. Also, globbing is supported in this option, for loose ordering. Note: It’s not necessary to list every single project directory, only those you need to prioritize, in a specific order. Any that are not listed explicitly, in order, will run last, in an arbitrary glob-based ordering, which is generally unpredictable. Note: The default ordering is always in effect and cannot be overridden, only appended with this option. To review the default ordering, run: `$ madrun update:projects --help` and look for the default `--order` option value.

```bash
$ madrun update:projects \
	--glob 'foo-*' --ignore 'foo-{utils,addons}' \
	--order 'foo-one' 'foo-two' 'foo-three' 'foo-four' 'foo-five' \
	--cmd 'git add --all && git commit -m "Message" && git push && git checkout main' \
	--run script:one script:two script:three \
	--dryRun
```

Important things to know about the `--glob` and `--ignore` options.

> `--glob`: Glob matching is relative to one directory up from the project you run `$ madrun update:projects` in. Note: Globstars `**` are not allowed given the nature of this command and will therefore throw an error. Please be more specific. Wildcards `*` are fine, but globstars `**` are prohibited in this option.

> `--ignore`: Glob matching is relative to one directory up from the project you run `$ madrun update:projects` in. This effectively excludes directories otherwise found by the `glob` option. Note: The default ignore patterns are always in effect and cannot be overridden, only appended with this option. Additionally, patterns in this project’s `.gitignore` file, and those within each matched project directory, are also always in effect. To review the default ignore patterns, run: `$ madrun update:projects --help` and look for the default `--ignore` option value.

The `--dryRun` option is your friend. Please use it to test things out before you remove the option and run things for real. Doing a dry run allows you to confirm that your CLI options produce the expected outcome.

### Help

```bash
$ madrun update:projects --help
```

## Non-Interactive Updates

Not permissable at this time. All updates _must_ be performed interactively.
