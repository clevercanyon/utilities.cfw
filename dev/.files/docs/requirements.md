# Requirements

## Homebrew for macOS

```bash
$ xcode-select --install
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
$ brew install mas # macOS app store extensions.
```

## Git via Homebrew

```bash
$ brew install git
```

## `n`: Interactively Manage Node Versions

### Step 1: Uninstall Brew's Node

Other packages depend on Node and may have installed Node even if you haven't done so yourself yet. Please be sure to complete all of these steps to avoid conflicts with `n` for Node version management.

```bash
$ brew uninstall --ignore-dependencies node
$ brew uninstall --force node

$ rm --force --recursive ~/Brew/lib/node_modules
$ brew cleanup # Removes broken node module symlinks.
```

### Step 2: Install `n` for Node Version Management

```bash
$ brew install n; # Includes NPM + corepack.
```

### Step 3: Customize `n` for Node Version Management

Set the `N_PREFIX` location to `~/.node` (recommended) by adding this line to your `~/.bash_profile`, `~/.zprofile`, or the like.

```bash
export N_PREFIX=~/.node;
```

Add `~/.node/bin` to your `PATH` by adding these lines to your `~/.bash_profile`, `~/.zprofile`, or the like.

```bash
PATH=~/.node/bin:"${PATH}";
MANPATH=~/.node/share/man:"${MANPATH}";
```

### Step 4: Enable Corepack w/ Yarn

Clever Canyon doesn't use Yarn, but you should enable in case Yarn is needed for other projects.

```bash
$ corepack enable
```

### Step 5: Enable Node ^19.2.0

Clever Canyon projects require Node ^19.2.0 and NPM ^8.19.3 that comes with it when using `n`.

```bash
$ n 19.2.0 # Includes NPM ^8.19.3.
```

## C10N Environment Variables

These environment variables authenticate you as a Clever Canyon developer.

-   Contact `@jaswrks` to request your credentials.

Add these lines to your `~/.bash_profile`, `~/.zprofile`, or the like.

```bash
export C10N_NPM_TOKEN='your_token_goes_here';
export C10N_GITHUB_TOKEN='your_token_goes_here';
export C10N_CLOUDFLARE_TOKEN='your_token_goes_here';
```
