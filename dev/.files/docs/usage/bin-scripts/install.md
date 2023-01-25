# `$ madrun install:*`

<small>Underlying bin script: `./dev/.files/bin/install.js`</small>

## Interactive Installs

```bash
$ madrun install:project
# Or, `$ madrun install:project --mode=dev`
# Mode can be one of: `dev`, `ci`, `stage`, or `prod` (default).
```

You will need a [Dotenv Vault](https://www.dotenv.org) login. Please contact `@jaswrks` or `@brucewrks` to request access. You must also have an environment meeting all [prerequisites](./prerequisites.md), along with the additional credentials noted at the bottom of the prerequisites article.

## Noninteractive Installs (e.g., CI)

```bash
$ npx @clevercanyon/madrun install:project --mode=ci
# Mode can be one of: `dev`, `ci`, `stage`, or `prod` (default).
```

Here we use `npx @clevercanyon/madrun` assuming that a CI, for example, won't have `madrun` installed globally already. In noninteractive installs — a CI, for example, must have the following environment variables. You must also have an environment meeting all of these [prerequisites](./prerequisites.md), along with the additional credentials noted at the bottom of the prerequisites article.

```bash
USER_DOTENV_KEY_MAIN
USER_DOTENV_KEY_CI # Where `_CI` matches `mode`.
```

These keys can be retrieved by running the following script interactively.

```
$ madrun envs:keys
```

## Help

```bash
$ madrun install --help
$ madrun envs:keys --help
```
