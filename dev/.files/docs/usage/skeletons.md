# Skeleton Project Templates

To start a new project with one of our skeletons, simply run:

```bash
$ cd ~/Projects/clevercanyon
$ madrun new ./my-new-project --from clevercanyon/skeleton
# Installs dependencies, envs, and builds your new project based on template.
```

-   Change `clevercanyon/skeleton` to [any other skeleton project](https://github.com/orgs/clevercanyon/repositories?q=skeleton) you'd like to start from.
-   Change `./my-new-project` to the directory you'd like your new project to live in.
    -   The name of this directory is important, as it may also be used for automatic git repository creation and default `./package.json` properties defined by our skeletons. Best to think of this as a repository name; i.e., set the directory basename to the slug you'd like your project to have on GitHub; e.g., `$ madrun new cool-plugin`.
-   For additional recommended options, see: `$ madrun new --help`

## Next Steps

```bash
$ cd ~/Projects/clevercanyon/my-new-project
$ madrun envs install --new # Interactively sets up new envs in Dotenv Vault.
```

You will need a [Dotenv Vault](https://www.dotenv.org) login. Please contact `@jaswrks` or `@brucewrks` to request access. You must also have an environment meeting all [prerequisites](./prerequisites.md), along with the additional credentials noted at the bottom of the prerequisites article.

-   **Note:** Running `$ madrun envs install --new` is optional; i.e., only if you need environment variables.

## Help

```bash
$ madrun install --help
$ madrun envs install --help
$ madrun envs --help

$ cd ~/Projects/clevercanyon
$ madrun new --help
```
