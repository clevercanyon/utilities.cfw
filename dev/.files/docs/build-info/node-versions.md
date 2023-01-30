# Updating Node & NPM Versions

### Step 1: `updates.json`

Open `./dev/.files/bin/updater/package.json/updates.json` and change these.

```json
{
	"engines": {
		"node": "^x.x.x || ^x.x.x",
		"npm": "^x.x.x || ^x.x.x"
	}
}
```

Note: It is suggested that we continue to support both the previous and newly supported versions so that repos can be upgraded to the proper version of Node using our scripts. If you attempt to enforce a specific version without supporting the previous, scripts in outdated repos may refuse to run until a user temporarily upgrades or downgrades just to run a dotfiles update.

### Step 2: `.browserslistrc`

Open `./.browserslistrc` and change these.

```text
[production]
node >= x.x.x

[any]
node >= x.x.x

[node]
node >= x.x.x
```

### Step 3: `deployment.yml`

Update matrix in: <https://github.com/clevercanyon/.github/blob/main/workflows/ci/deployment.yml>
