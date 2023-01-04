# `./dev/.files/bin/install.js`

See Also: [Prerequisites](./prerequisites.md)

## Interactive Installs

```bash
$ npm run install:project
# Or, `$ npm run install:project -- --mode=dev`
# Mode can be one of: `dev`, `ci`, `stage`, or `prod` (default).
```

You will need a Dotenv Vault login. Please contact `@jaswrks` to request access. You must also have an environment meeting all [prerequisites](./prerequisites.md), along with the additional credentials noted at the bottom of the prerequisites article.

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
