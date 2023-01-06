# Skeleton Project Templates

To start a new project with one of our skeletons, simply run:

```bash
$ cd ~/Projects/clevercanyon
$ npx degit clevercanyon/skeleton my-new-project --mode=git
```

-   Change `clevercanyon/skeleton` to [any other skeleton project](https://github.com/orgs/clevercanyon/repositories?q=skeleton) you'd like to start from.
-   Change `my-new-project` to the directory you'd like your new project to live in.

## Next Steps

```bash
$ cd ~/Projects/clevercanyon/my-new-project
$ npm run install:project # Installs NPM dependencies, envs, and builds project.
$ npm run envs:setup:new  # Interactively sets up new envs in Dotenv Vault for this project.
```

You will need a [Dotenv Vault](https://www.dotenv.org) login. Please contact `@jaswrks` to request access. You must also have an environment meeting all [prerequisites](./prerequisites.md), along with the additional credentials noted at the bottom of the prerequisites article.

-   **Note:** Running `$ npm run envs:setup:new` is optional. If your project won't need any environment variables you can skip. Also, you should delete the `./.env.vault` file in the main project directory, along with the entire `./dev/.envs` directory. This step is important because if you didn't setup new envs, the existing ones remain connected to the skeleton project, and we don't want any of our update scripts to push changes to the skeletons inadvertently. Delete the `./.env.vault` file!

## Help

```bash
$ npm run install:help
$ npm run envs:help
```
