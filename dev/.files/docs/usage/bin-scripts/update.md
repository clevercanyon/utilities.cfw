# `$ npm run update:*`

<small>Underlying bin script: `./dev/.files/bin/update.js`</small>

All updates _must_ be performed interactively.

## Updates Dotfiles

```bash
$ npm run update:dotfiles
```

See Also: [Prerequisites](./prerequisites.md)

-   When run inside the `@clevercanyon/skeleton` project, any pending changes will be added, committed, and pushed to the remote git origin. This is done to avoid a devastating loss of all changes prior to a self-update in the `@clevercanyon/skeleton`.

-   It then downloads, or pulls from cache, the latest `@clevercanyon/skeleton` containing our master copy of `./dev/.files` and the accompanying project dotfiles found in the main `@clevercanyon/skeleton` project directory.

-   Runs a full dotfiles update using a copy of the latest `./dev/.files/bin/updater/index.js` from `@clevercanyon/skeleton`. This will update the entire `./dev/.files` directory and process updates across all the accompanying project dotfiles found in the main `@clevercanyon/skeleton` project directory. Any `<custom:start></custom:end>` sections in your project will be preserved.

-   A few properties in `./package.json` will be reset to their expected and necessary values during the update. For a detailed look at which `./package.json` properties you should never change (or they'll be lost during a dotfiles update), please review `./dev/.files/bin/updater/data/package.json/updates.json`.

    -   Additionally, when running the `$ npm run update:project` script, the following `./package.json` properties will also be automatically updated to match your project build configuration. Therefore, you should never change any of these manually, as those changes would be lost during a project update.

    ```json
    "exports": [],
    "module": "",
    "main": "",
    "browser": "",
    "unpkg": "",
    "types": "",
    "typesVersions": {}
    ```

## Updates Dotfiles + Project

```bash
$ npm run update:project
```

-   Updates dotfiles (see details above).
-   Runs `npm update --ignore-scripts --save`, to update the project’s NPM packages.
-   If a dotenv vault is present; re-encrypts the `.env.vault` to reflect any `./dev/.envs/.env*` file changes.
-   Updates the project build (`--mode=prod`), which is located in the `./dist` directory.

## Updates Dotfiles + Project + Repos

```bash
$ npm run update:project:repos
```

-   Updates dotfiles (see details above).
-   Also updates project (see details above).
-   If `--pkgs` is also set and it's an NPM package in a publishable branch/state, the `--repos` update also performs an NPM version bump and git commit with the expectation that a rebuild is about to occur, which needs the bumped version, and that (see below) a publish event will occur after other updates are finished.
-   If it's a git repo; adds, commits, and pushes to current branch.
-   If it's a dotenv vault; pushes current copy of all envs to remote vault.

## Updates Dotfiles + Project + Repos + Pkgs

```bash
$ npm run update:project:repos:pkgs
```

-   Updates dotfiles (see details above).
-   Also updates project (see details above).
-   Also updates project repos (see details above).
-   If it's an NPM package in a publishable branch/state, this runs `npm publish --ignore-scripts`, effectively deploying the updated package to the NPM repository.

## Help

```bash
$ npm run update:help
```

---

## Updating Multiple Projects

When updating multiple projects, the `./update.js` script simply steps up one directory level and looks for sibling project directories with a customizable set of glob and ignore patterns, as described below. After globbing, matched project directories, or deeper, can be updated all in a single command, saving an enormous amount of time.

### Recommended Project Directory Tree Structure

```text
~/Projects/clevercanyon
 - skeleton
 - utilities
 - forks
   - project.fork
 - foobar
 - etc., etc.
```

With this structure, all `clevercanyon` projects are together. If you are working in the `foobar` project and do an `$ npm run update:projects::dotfiles`, the script steps up one directory to `~/Projects/clevercanyon` where it globs for siblings. In the matching directories, it updates each of their dotfiles.

By default, the glob pattern is `*`, matching all direct siblings. However, if any of the glob patterns is set to a single `*` (as in the default case), scripts are only run if the project directory contains a `./dev/.files` directory and a `./package.json` file.

When the glob pattern is set to something else, you must be sure of what you're doing because the restriction is no longer applied and all scripts and/or custom commands will run as requested with no validation. For this reason it is strongly suggested that you do a `--dryRun` and review carefully before removing `--dryRun` and running for real.

<small>_**Note:** All of the examples below end with `--dryRun`. Remove the flag when running for real._</small>

### Updates Dotfiles

```bash
$ npm run update:projects::dotfiles -- --dryRun
```

-   Updates dotfiles in all matching directories (see details above).

### Updates Dotfiles + Project

```bash
$ npm run update:projects::project -- --dryRun
```

-   Updates dotfiles in all matching directories (see details above).
-   Also updates project in all matching directories (see details above).

### Updates Dotfiles + Project + Repos

```bash
$ npm run update:projects::project:repos -- --dryRun
```

-   Updates dotfiles in all matching directories (see details above).
-   Also updates project in all matching directories (see details above).
-   Also updates project repos in all matching directories (see details above).

### Updates Dotfiles + Project + Repos + Pkgs

```bash
$ npm run update:projects::project:repos:pkgs -- --dryRun
```

-   Updates dotfiles in all matching directories (see details above).
-   Also updates project in all matching directories (see details above).
-   Also updates project repos in all matching directories (see details above).
-   Also updates packages in all matching directories (see details above).

### Updates Projects by Running a Custom Command

```bash
$ npm run update:projects:: -- --cmd 'git checkout main' --dryRun
```

### Updates Projects by Running NPM Scripts

```bash
$ npm run update:projects:: -- --run script:one script:two script:three --dryRun
```

### Updates w/ Custom Globs and Ignores

You can pass more than a single glob pattern, and more than a single ignore pattern. Also, you can combine `--cmd` with `--run`. Note: `--cmd` always runs first, no matter what order you pass the options in.

```bash
$ npm run update:projects:: -- \
	--glob 'foo-*' --ignore 'foo-{utils,addons}' \
	--cmd 'git add --all && git commit -m "Message" && git push && git checkout main' \
	--run script:one script:two script:three \
	--dryRun
```

```bash
$ npm run update:projects:: -- \
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

$ npm run update:projects:: -- \
	--glob 'foo' 'bar-{two,three,four}' 'baz-*-utils' \
	--ignore 'baz-foo-utils' 'baz-bar-utils' \
	--cmd '"${cmd}"' \
	--dryRun
```

If you need more control over project directory sequence, consider using the `--order` option.

> `--order`: Project subpaths to prioritize, in order. Also, globbing is supported in this option, for loose ordering. Note: It’s not necessary to list every single project directory, only those you need to prioritize, in a specific order. Any that are not listed explicitly, in order, will run last, in an arbitrary glob-based ordering, which is generally unpredictable. Note: The default ordering is always in effect and cannot be overridden, only appended with this option. To review the default ordering, run: `$ npm run update:projects::help` and look for the default `--order` option value.

```bash
$ npm run update:projects:: -- \
	--glob 'foo-*' --ignore 'foo-{utils,addons}' \
	--order 'foo-one' 'foo-two' 'foo-three' 'foo-four' 'foo-five' \
	--cmd 'git add --all && git commit -m "Message" && git push && git checkout main' \
	--run script:one script:two script:three \
	--dryRun
```

Important things to know about the `--glob` and `--ignore` options.

> `--glob`: Glob matching is relative to one directory up from the project you run `$ npm run update:projects::` in. Note: Globstars `**` are not allowed given the nature of this command and will therefore throw an error. Please be more specific. Wildcards `*` are fine, but globstars `**` are prohibited in this option.

> `--ignore`: Glob matching is relative to one directory up from the project you run `$ npm run update:projects::` in. This effectively excludes directories otherwise found by the `glob` option. Note: The default ignore patterns are always in effect and cannot be overridden, only appended with this option. Additionally, patterns in this project’s `.gitignore` file, and those within each matched project directory, are also always in effect. To review the default ignore patterns, run: `$ npm run update:projects::help` and look for the default `--ignore` option value.

The `--dryRun` option is your friend. Please use it to test things out before you remove the option and run things for real. Doing a dry run allows you to confirm that your CLI options produce the expected outcome.

### Help

```bash
$ npm run update:projects::help
```

---

## Non-Interactive Updates

Not permissable at this time. All updates _must_ be performed interactively.
