# Prerequisites

## macOS

macOS is required to work as a Clever Canyon developer. An M1 Pro chipset, or better, is strongly suggested. We no longer support the older intel chips in any of our supporting documentation. Also, please update to macOS Ventura or higher.

## Homebrew for macOS

```bash
$ xcode-select --install
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
$ brew install mas # macOS app store for Homebrew. Not required, but recommended.
```

_**Note:** On M1 MacBooks, Homebrew installs into `/opt/homebrew` instead of `/usr/local`. If you have a `PATH` configured that’s expecting to find binaries in `/usr/local/bin` you will need to update those to `/opt/homebrew/bin` instead._

## Bash via Homebrew

macOS ships with an old version of bash. Homebrew installs the latest version. You need to install the latest version of bash for scripting needs; i.e., even if you’re not using bash as your preferred shell, you still need to install the latest version of bash.

```bash
$ brew install bash
$ brew install bash-completion@2 # Not required, but recommended.
```

## Git via Homebrew

macOS ships with an old version of git. Homebrew installs the latest version.

```bash
$ brew install git
$ brew install git-lfs # Not required, but recommended.
$ brew install gh      # Not required, but highly recommended.
```

`git lfs` is for large file storage. See: [git-lfs.com](https://git-lfs.com).

We recommend the new `gh` (GitHub CLI) over `hub`, which is outdated now.

-   `gh`: <https://cli.github.com> (new; recommended)
    -   <https://github.com/cli/cli/blob/trunk/docs/gh-vs-hub.md>
-   `hub`: <https://github.com/github/hub> (old)

### Use `gh` Credential Helper (Recommended)

```bash
$ gh auth setup-git
$ gh config set git_protocol https
# Always clone repos using the `https` protocol.
# `https` is more portable and allows for token authentication.
```

After, you should find entries like these in your `~/.gitconfig` file.

```ini
[credential]
helper=store

[credential "https://github.com"]
helper=# See: <https://o5p.me/6Sq7kB>
helper=!gh auth git-credential

[credential "https://gist.github.com"]
helper=# See: <https://o5p.me/6Sq7kB>
helper=!gh auth git-credential
```

Your `~/.config/gh/config.yml` file should now contain.

```yaml
git_protocol: https
```

## `n`: Interactively Manage Node Versions

The `n` package allows you to juggle Node versions, as required, for various needs.

### Step 1: Uninstall Brew's Node

Other packages depend on Node and may have installed Node even if you haven't done so yourself yet. Please be sure to complete all of these steps to avoid conflicts with `n` for Node version management.

```bash
$ brew uninstall --ignore-dependencies node
$ brew uninstall --force node

$ rm --force --recursive /opt/homebrew/lib/node_modules
$ brew cleanup # Removes broken node module symlinks.
```

### Step 2: Install `n` for Node Version Management

```bash
$ brew install n # Includes NPM + corepack.
```

### Step 3: Customize `n` for Node Version Management

Set the `N_PREFIX` location to `/opt/homebrew/opt/n.node` (recommended) by adding this line to your macOS `~/.profile`.

```bash
export N_PREFIX=/opt/homebrew/opt/n.node
```

Add `/opt/homebrew/opt/n.node/bin` to your `PATH` by adding these lines to your macOS `~/.profile`.

```bash
PATH=/opt/homebrew/opt/n.node/bin:"${PATH}"
MANPATH=/opt/homebrew/opt/n.node/share/man:"${MANPATH}"
INFOPATH=/opt/homebrew/opt/n.node/share/info:"${INFOPATH}"
```

### Step 4: Enable Corepack w/ Yarn

Clever Canyon doesn't use Yarn, but you should enable in case Yarn is needed for other projects.

```bash
$ corepack enable
```

### Step 5: Enable Required Node Version

Clever Canyon projects require a specific version of Node and NPM. The correct version of NPM always comes with Node when you’re using `n` for Node version management. To find the current version of Node that’s required by Clever Canyon projects, please see the `engines` key in [this skeleton file](https://github.com/clevercanyon/skeleton/blob/main/dev/.files/bin/updater/data/package.json/updates.json). Take the Node version and use it to replace `[version]`.

```bash
$ n [version] # Automatically includes correct version of NPM.
```

### Step 6. Optionally Enable NPM Completion

The below assumes bash. You may need to adjust if you're using zsh, for example.

```bash
$ npm completion > /opt/homebrew/etc/bash_completion.d/npm
# See: <https://docs.npmjs.com/cli/commands/npm-completion>
```

## Mad Run: We're Mad About Scripts

Runs one or more commands configured by a JS file; in sequence. We use this tool at Clever Canyon instead of NPM scripts. Mad Run was developed internally and should be installed globally. You'll see that most of our GitHub repos include a `./.madrun.js` config file along with instructions regarding scripts you can run that’ll make your workflow easier.

```bash
$ npm install -g @clevercanyon/madrun
```

## Environment Variables

These environment variables authenticate you as a Clever Canyon developer. Please add the following lines to your macOS `~/.profile`.There are details below that help with token generation, for each of these. Please read carefully.

```bash
export USER_GITHUB_TOKEN='your_token_goes_here'
export USER_NPM_TOKEN='your_token_goes_here'
export USER_CLOUDFLARE_TOKEN='your_token_goes_here'
```

### `USER_GITHUB_TOKEN`

-   Contact @jaswrks or @bruckwrks and request access to the Clever Canyon organization on GitHub.
-   Create a personal **classic** (aka: legacy) access token (recommended). Select scopes `repo`, `workflow`, and `read:org`, at minimum. Please note that a classic access token works for all organizations you're a member of. A 1 year expiration date is suggested.
    -   See: <https://github.com/settings/tokens/new>
-   Alternatively, create a personal **granular** (aka: fine-grained) access token with **resource owner** set to `clevercanyon`. Give the token access to **all respositories** and enable read/write (or highest available) access for all repository permissions. Leave account permissions empty. A 1 year expiration date is suggested. _Note: The caveat with granular access tokens is that they are created for a single resource owner. Therefore, you'll need a separate token for anything outside of Clever Canyon. In the future we anticipate that GitHub will improve, at which time we'll update these instructions, favoring granular access._
    -   See: <https://github.com/settings/personal-access-tokens/new>

### `USER_NPM_TOKEN`

-   Contact @jaswrks or @bruckwrks and request access to the Clever Canyon organization on NPM.
-   Create a personal **granular** (aka: fine-grained) access token with read/write access. If `@clevercanyon` is also listed separately as an organization (requires an NPM admin role or higher), then please do add the `@clevercanyon` **organization** as well, also with read/write access, at minimum. A 1 year expiration date is suggested.
    -   See: <https://docs.npmjs.com/about-access-tokens>

### `USER_CLOUDFLARE_TOKEN`

-   Contact @jaswrks or @bruckwrks and request access to the Clever Canyon organization on Cloudflare.
-   Create a personal API token using Cloudflare's **Edit Cloudflare Workers** template type, which predefines all of the necessary/mininum permissions. Set **Account Resources** to include Clever Canyon, at minimum, but you probably want to create the token for 'all accounts'. Set **Zone Resources** to include all zones from Clever Canyon, at minimum, but you probably want to create the token for 'all zones'. A 1 year expiration date is suggested.
    -   See: <https://dash.cloudflare.com/profile/api-tokens>

## Dotenv Vault Account Access

You will also need access to Clever Canyon’s [Dotenv Vault](https://www.dotenv.org).

-   Contact @jaswrks or @bruckwrks to request Clever Canyon org access at Dotenv Vault.
-   No token is needed. Dotenv Vault developer authentication must occur in a web browser. If you're working on repos where CLI scripts keep opening browser tabs asking for your Dotenv Vault login credentials, that's why. To resolve, contact @jaswrks or @bruckwrks and request access to the Clever Canyon organization at Dotenv Vault.

## Environment Variable Tips & Tricks

A neat trick is to exploit the `include` and `includeIf` directives available in `~/.gitconfig`.

```ini
[include]
path=~/.config/git/personal/.gitconfig

[includeIf "gitdir/i:/**/Projects/clevercanyon/**"]
path=~/.config/git/clevercanyon/.gitconfig
```

Then, in your `personal/.gitconfig` and `clevercanyon/.gitconfig` files, add the names of your own custom environment variables. The last step is to alias commands like `madrun`, `npm`, `npx`, `git`, `gh`; setting appropriate environment variables based on git config context, which is established by the `include` and `includeIf` directives shown above.

Here's a rough example you can adapt to your liking.

`~/.profile`, `~/.bash_profile`, or `~/.zprofile`.

```bash
export MY_PERSONAL_GITHUB_TOKEN='your_token_goes_here'
export MY_PERSONAL_NPM_TOKEN='your_token_goes_here'
export MY_PERSONAL_CLOUDFLARE_TOKEN='your_token_goes_here'

export MY_C10N_GITHUB_TOKEN='your_token_goes_here'
export MY_C10N_NPM_TOKEN='your_token_goes_here'
export MY_C10N_CLOUDFLARE_TOKEN='your_token_goes_here'
```

`~/.config/git/personal/.gitconfig` file.

```ini
[github]
token=MY_PERSONAL_GITHUB_TOKEN

[npm]
token=MY_PERSONAL_NPM_TOKEN

[cloudflare]
token=MY_PERSONAL_CLOUDFLARE_TOKEN
```

`~/.config/git/clevercanyon/.gitconfig` file.

```ini
[github]
token=MY_C10N_GITHUB_TOKEN

[npm]
token=MY_C10N_NPM_TOKEN

[cloudflare]
token=MY_C10N_CLOUDFLARE_TOKEN
```

`madrun()` function in `~/.profile`, `~/.bash_profile`, or `~/.zprofile`.

```bash
#!/usr/bin/env bash

function madrun() {
	local github_token_env_var="$(command git config github.token)"
	local npm_token_env_var="$(command git config npm.token)"
	local cloudflare_token_env_var="$(command git config cloudflare.token)"

	USER_GITHUB_TOKEN="${!github_token_env_var}" \
		USER_NPM_TOKEN="${!npm_token_env_var}" \
		USER_CLOUDFLARE_TOKEN="${!cloudflare_token_env_var}" \
		command madrun "${@}"
}
```

`npm()` function in `~/.profile`, `~/.bash_profile`, or `~/.zprofile`.

```bash
#!/usr/bin/env bash

function npm() {
	local github_token_env_var="$(command git config github.token)"
	local npm_token_env_var="$(command git config npm.token)"
	local cloudflare_token_env_var="$(command git config cloudflare.token)"

	USER_GITHUB_TOKEN="${!github_token_env_var}" \
		USER_NPM_TOKEN="${!npm_token_env_var}" \
		USER_CLOUDFLARE_TOKEN="${!cloudflare_token_env_var}" \
		command npm "${@}"
}
```

`npx()` function in `~/.profile`, `~/.bash_profile`, or `~/.zprofile`.

```bash
#!/usr/bin/env bash

function npx() {
	local github_token_env_var="$(command git config github.token)"
	local npm_token_env_var="$(command git config npm.token)"
	local cloudflare_token_env_var="$(command git config cloudflare.token)"

	USER_GITHUB_TOKEN="${!github_token_env_var}" \
		USER_NPM_TOKEN="${!npm_token_env_var}" \
		USER_CLOUDFLARE_TOKEN="${!cloudflare_token_env_var}" \
		command npx "${@}"
}
```

`git()` function in `~/.profile`, `~/.bash_profile`, or `~/.zprofile`.

```bash
#!/usr/bin/env bash

function git() {
	local github_token_env_var="$(command git config github.token)"

	GH_TOKEN="${!github_token_env_var}" \
		command git "${@}"
}
```

`gh()` function in `~/.profile`, `~/.bash_profile`, or `~/.zprofile`.

```bash
#!/usr/bin/env bash

function gh() {
	local github_token_env_var="$(command git config github.token)"

	GH_TOKEN="${!github_token_env_var}" \
		command gh "${@}"
}
```

_Note: The `command` call avoids infinite loops; i.e., `command` bypasses functions. The `${!` part expands an environment variable name string into the environment variable value. The `"${@}"` part is what passes any command-line arguments on to the underlying commands that you're aliasing._
