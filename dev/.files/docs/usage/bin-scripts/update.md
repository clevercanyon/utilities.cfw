# `$ madrun update`

<small>Underlying bin script: `./dev/.files/bin/update.mjs`</small>

All updates _must_ be performed interactively.

## Updates Dotfiles

```bash
$ madrun update dotfiles
```

See Also: [Prerequisites](./prerequisites.md)

-   When run inside the `@clevercanyon/skeleton` project, any pending changes will be added, committed, and pushed to the remote git origin. This is done to avoid a devastating loss of all changes prior to a self-update in the `@clevercanyon/skeleton`. Also, the current commit SHA must be in sync with that of the remote origin; i.e., not ahead of or behind the remote origin.

-   It then downloads, or pulls from cache, the latest `@clevercanyon/skeleton` containing our primary copy of `./dev/.files` and the accompanying project dotfiles found in the `main` branch of `@clevercanyon/skeleton`.

    -   In the case of being run inside the `@clevercanyon/skeleton` project (i.e., a self-update scenario), it is not the `main` branch, but the _current_ branch that we pull from. Otherwise, the `main` branch is pulled as per usual.

-   Runs a full dotfiles update using a copy of the latest `./dev/.files/bin/updater/index.mjs` from `@clevercanyon/skeleton`. This will update the entire `./dev/.files` directory and process updates across all the accompanying project dotfiles found in the `@clevercanyon/skeleton` project directory. Any `<custom:start></custom:end>` sections in your project will be preserved.

-   A few properties in `./package.json` will be reset to their expected and necessary values during the update. For a detailed look at which `./package.json` properties you should never change (or they'll be lost during a dotfiles update), please review `./dev/.files/bin/updater/data/package.json/updates.json`.

    These are the properties you should not update manually.

    ```json
    "funding": "",
    "workspaces": [],
    "cpu": [],
    "os": [],
    "engines": {},
    ```

    These are the properties that we explicitly disallow.
    Instead of `"scripts"`, we use `$ madrun`. See: [Prerequisites](./prerequisites.md)

    ```json
    ["typings", "scripts"]
    ```

    Additionally, when running the `$ madrun update project` script, the following `./package.json` properties will also be automatically updated to match your project build configuration. Therefore, you should never change any of these manually, as those changes would be lost during a project update.

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

## Updates Project

```bash
$ madrun update project
```

-   Runs `$ npm update --save` to update the project’s NPM packages.
-   If a Dotenv Vault is present, all of the `./dev/.envs/.env*` files are re-compiled.
-   Updates the project build (`--mode=prod`), which is located in the `./dist` directory.

## Updates Project + Repos

```bash
$ madrun update project --repos
```

-   Runs `$ npm update --save`, to update the project’s NPM packages.
-   If it's a GitHub repository and this script is run by a GitHub repository admin, the remote origin at GitHub is configured automatically using org-wide standards established by Clever Canyon for GitHub repositories. For example; GitHub wikis, issues, projects, discussions, and downloads are all enabled. Repo security settings are configured, the `main` branch is protected, and the appropriate teams are added/removed from the repository. GitHub repository admins can configure repo team access using `./package.json` by setting `config.c10n.&.github.teams`.
-   If it's a Dotenv Vault; pushes current copy of all envs to remote vault.
    -   All `./dev/.envs/.env*` files are re-compiled as necessary.
    -   The `./.env.vault` is re-encrypted to reflect any `./dev/.envs/.env*` file changes.
    -   If it's a GitHub repository and this script is run by a GitHub repository admin, when environments are pushed, the remote GitHub origin is updated as well. GitHub repository deployment environments are created/removed appropriately to match standards established by Clever Canyon for GitHub repositories. Additionally, Dotenv Valult secret keys are extracted and configured for each GitHub repository environment, and a `prod` deployment policy is created; i.e., only the `main` branch can be deployed to the `prod` environment using GitHub actions.
-   If `--repos` is accompanied by `--pkgs`, and it's an NPM package in a publishable branch/state, the `--repos` update also performs a version incrementation with the expectation that a rebuild is about to occur, which needs the bumped version.
-   The project’s build is updated (`--mode=prod`), which is located in the `./dist` directory.
-   If it's a git repo; adds, commits, and pushes to current branch; including a push of all git tags.

## Updates Project + Repos + Pkgs

```bash
$ madrun update project --repos --pkgs
```

-   Updates project repos (see details above).
-   If it's an NPM package in a publishable branch/state, this runs `$ npm publish`, effectively deploying the updated package with an incremented version to the NPM registry just prior to the the Git push that occurs in the repos update phase.
    -   If it's a git repo, an annotated git tag is created and committed; which occurs after `$ npm publish` is complete. Additionally, if it's a GitHub repository, a release is generated at GitHub that points to the tagged commit and includes a copy of `./dist` in zip format. The zip is purely for archival purposes, but might be used for something else in the future.
    -   When a publish occurs, if the registry is npmjs, and this script is run by an npmjs package admin, the remote package origin is updated as well. npmjs teams are added/removed appropriately reflecting standards established by Clever Canyon for npmjs packages. Package admins can configure team access using `./package.json` by setting `config.c10n.&.npmjs.teams`. If not set, team access defaults to a reflection of `config.c10n.&.github.teams`.

## Help

```bash
$ madrun update --help
$ madrun update dotfiles --help
$ madrun update project --help
```

## Updating Multiple Projects

When updating multiple projects, the `./update.js` script simply steps up one directory level and looks for sibling project directories with a customizable set of glob and ignore patterns, as described below. After globbing, the matching project directories can be updated all in a single command, saving an enormous amount of time. A bit scary at first, but _massive_ productivity, _woohoo_!

### Recommended Project Directory Tree Structure

_Note: This list of projects is not a suggestion regarding which repos to clone, but rather guidance on where to put projects in your local filesystem. As seen here, please keep all projects at the same level vs. nesting them into different sub-directory groups._

```text
~/Projects/clevercanyon
 - madrun
 - my-project
 - project.fork
 - skeleton
 - skeleton-dev-deps
 - skeleton.cma.web
 - utilities
 - utilities.node
 - utilities.web
 - ... etc.
```

With this structure, all `clevercanyon` projects are together. If you are working in the `my-project` directory and do `$ madrun update projects --run[ 'update dotfiles' ]`, the script steps up one directory to `~/Projects/clevercanyon` where it globs for siblings. In the matching directories, it updates each of their dotfiles.

By default, the glob patterns are `[ '*', '.github' ]`, matching all direct siblings, and also matching one special `.github` directory, if it's present on your system. The special `.github` repository contains our GitHub organization config files.

If any of the glob patterns is set to a single `*` (as in the default case), scripts are only run if the project directory contains a `./dev/.files` directory and a `./package.json` file.

However, when the glob pattern is set to something else and doesn’t contain a glob with a single `*`, you must be sure of what you're doing, because the restriction is no longer applied and all scripts and/or custom commands will run as requested with no requirement that a project contain a `./dev/.files` directory or a `./package.json` file. For this reason it is strongly suggested that you do a `--dryRun` and review carefully. Massive productivity can turn into massive cleanup if you're not careful!

<small>_**Note:** All of the examples below end with `--dryRun`. Remove the flag when running for real._</small>

### Updates Dotfiles

```bash
$ madrun update projects --run[ 'update dotfiles' ] --dryRun
```

-   Updates dotfiles in all matching directories (see details above).
-   By default, the glob patterns are `[ '*', '.github' ]`, literally matching _all_ directories.

**⚠ WARNING: Array Syntax**

-   👎🏻 `--run['a','b','c']` and `--run [ 'a', 'b', 'c' ]` are both wrong.
    -   These are **not the same** as `--run[ 'a', 'b', 'c' ]`, which is valid 💯 👍🏻.
-   Spacing is critically important when passing arguments to any command-line interface.
    -   The option name is `--run[`, always followed by a <kbd>space</kbd>.
    -   ... followed by the `'list', 'of', 'array items'` (commas optional). It is each unquoted <kbd>space</kbd> that’s delimiting array items, not the commas, which are purely cosmetic. Commas could be omitted entirely if you prefer.
    -   ... always followed by a <kbd>space</kbd>, then a closing array bracket `]`
-   👍🏻 Valid Examples
    -   `--run[ 'a', 'b', 'c' ]` and `--run[ 'a' 'b' 'c' ]` are equivalent (commas optional).
    -   `--run[ 'a' ]` and `--run[ 'a', ]` are equivalent. A single array item (comma optional).
-   👍🏻 Alternate Syntax w/ Caveats
    -   `--run 'a'` shorthand is valid, but this syntax supports just a single array item.
    -   `--run[] 'a' 'b' 'c'` shorthand is valid and supports multiple array items. Commas are not allowed with this syntax, even if purely cosmetic. Also, this syntax cannot be followed by positional arguments, because `--run[]` is greedy in the collection of array items that follow its array option name.

### Updates Dotfiles + Project

```bash
$ madrun update projects --run[ 'update dotfiles', 'update project' ] --dryRun
```

-   Updates dotfiles + project in all matching directories (see details above).
-   By default, the glob patterns are `[ '*', '.github' ]`, literally matching _all_ directories.

### Updates Dotfiles + Project + Repos

```bash
$ madrun update projects --run[ 'update dotfiles', 'update project --repos' ] --dryRun
```

-   Updates dotfiles + project in all matching directories (see details above).
-   Also updates project repos in all matching directories (see details above).
-   By default, the glob patterns are `[ '*', '.github' ]`, literally matching _all_ directories.

### Updates Dotfiles + Project + Repos + Pkgs

```bash
$ madrun update projects --run[ 'update dotfiles', 'update project --repos --pkgs' ] --dryRun
```

-   Updates dotfiles + project in all matching directories (see details above).
-   Also updates project repos in all matching directories (see details above).
-   Also updates packages in all matching directories (see details above).
-   By default, the glob patterns are `[ '*', '.github' ]`, literally matching _all_ directories.

### Updates Projects by Running a Custom Command

```bash
$ madrun update projects --cmds[ 'git checkout main' ] --dryRun
```

-   By default, the glob patterns are `[ '*', '.github' ]`, literally matching _all_ directories.

### Updates Projects by Running Multiple Scripts

```bash
$ madrun update projects --run[ 'script-one', 'script-two', 'script-three' ] --dryRun
```

-   By default, the glob patterns are `[ '*', '.github' ]`, literally matching _all_ directories.

### Updates w/ Custom Globs and Ignores

You can pass more than a single glob pattern, and more than a single ignore pattern. Also, you can combine `--cmds` with `--run`. Note: `--cmds` always run first, no matter what order you pass the options in. However, the arrays given within these options; e.g., `--cmds[ 1, 2, 3 ]` and `--run[ 4, 5, 6 ]` are always run in the order given. Thus, `$ madrun update projects --run[ a, b, c ] --cmds[ d, e, f ]` will actually run in this order: `d, e, f, a, b, c`, because `--cmds` always run first.

```bash
$ madrun update projects \
	--globs[ 'foo-*' ] --ignore[ 'foo-{utils,addons}' ] \
	--cmds[ 'git add --all', 'git commit -m "Message"', 'git push' ] \
	--run[ 'script-one', 'script-two', 'script-three' ] \
	--dryRun
```

```bash
$ madrun update projects \
	--globs[ 'foo', 'bar-{two,three,four}', 'baz-*-utils' ] \
	--ignore[ 'baz-foo-utils', 'baz-bar-utils' ] \
	--cmds[ 'git add --all', 'git commit -m "Message"', 'git push' ] \
	--run[ 'script-one', 'script-two', 'script-three' ] \
	--dryRun
```

```bash
$ madrun update projects \
	--globs[ 'foo-*' ] --ignore[ 'foo-{utils,addons}' ] \
	--cmds[ 'git add --all && git commit -m "Message" && git push' ] \
	--run[ 'script-one && script-two && script-three' ] \
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

$ madrun update projects \
	--globs[ 'foo', 'bar-{two,three,four}', 'baz-*-utils' ] \
	--ignore[ 'baz-foo-utils', 'baz-bar-utils' ] \
	--cmds[ '"${cmd}"' ] \
	--dryRun
```

If you need more control over project directory sequence, consider using the `--order` option.

> `--order`: Project subpaths to prioritize, in order. Also, globbing is supported in this option, for loose ordering. Note: It’s not necessary to list every single project directory, only those you need to prioritize, in a specific order. Any that are not listed explicitly, in order, will run last, in an arbitrary glob-based ordering, which is generally unpredictable. Note: The default ordering is always in effect and cannot be overridden, only appended with this option. To review the default ordering, run: `$ madrun update projects --help` and look for the default `--order` option value, which contains a few core project directory names that we always prioritize over any others given.

```bash
$ madrun update projects \
	--globs[ 'foo-*' ] --ignore[ 'foo-{utils,addons}' ] \
	--order[ 'foo-one', 'foo-two', 'foo-three', 'foo-four', 'foo-five' ] \
	--cmds[ 'git add --all && git commit -m "Message" && git push && git checkout main' ] \
	--run[ 'script:one', 'script:two', 'script:three' ] \
	--dryRun
```

Important things to know about the `--globs` and `--ignore` options.

> `--globs`: Glob matching is relative to one directory up from the project you run `$ madrun update projects` in. Note: Globstars `**` are not allowed given the nature of this command and will therefore throw an error. Please be more specific. Wildcards `*` are fine, but globstars `**` are prohibited in this option.

> `--ignore`: Glob matching is relative to one directory up from the project you run `$ madrun update projects` in. This effectively excludes directories otherwise found by the `globs` option. Note: The default ignore patterns are always in effect and cannot be overridden, only appended with this option. Additionally, patterns in this project’s `./.gitignore` file, and those within each matched project directory, are also always in effect. To review the default ignore patterns, run: `$ madrun update projects --help` and look for the default `--ignore` option value.

The `--dryRun` option is your friend. Please use it to test things out before you remove the option and run things for real. Doing a dry run allows you to confirm that your CLI options produce the expected outcome.

### Help

```bash
$ madrun update --help
$ madrun update projects --help
```

## Non-Interactive Updates

Not permissable at this time. All updates _must_ be performed interactively.
