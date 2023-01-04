# `./dev/.files/bin/install.js`

See Also: [Prerequisites](./prerequisites.md)

## Interactive Installs

### Option 1

```bash
$ npm ci # Clean install is preferred.
# $ npm install # This works also, but please favor `$ npm ci`.
# Each of these trigger our `postinstall` script: `install.js project`.
```

<small>_See also: [`npm ci` docs](https://docs.npmjs.com/cli/commands/npm-ci) to review important differences between `npm ci` and `npm install`._</small>

### Option 2

This does an `npm ci` clean install, then runs `./dev/.files/bin/install.js project`.

```bash
$ npm run install:project -- --mode=dev
# Mode can be one of: `dev`, `ci`, `stage`, or `prod` (default).
```

In either case, you will need a Dotenv Vault login. Please contact `@jaswrks` to request access. You must also have an environment meeting all of these [prerequisites](./prerequisites.md), along with the additional credentials noted at the bottom of the prerequisites article.

## Noninteractive Installs (e.g., CI)

```bash
$ npm run install:project -- --mode=ci
# Mode can be one of: `dev`, `ci`, `stage`, or `prod` (default).
```

In noninteractive installs you must have the following environment variables. You must also have an environment meeting all of these [prerequisites](./prerequisites.md), along with the additional credentials noted at the bottom of the prerequisites article.

```
C10N_DOTENV_KEY_MAIN
C10N_DOTENV_KEY_CI (or another, matching mode above)
```

These keys can be retrieved by running the following script interactively.

```
$ npm run envs:keys
```

## Help

```bash
$ npm run install:help
```
