# `appType` + `targetEnv` Possibilities

## Default Skeleton + Dependencies

-   [clevercanyon/skeleton](https://github.com/clevercanyon/skeleton) (`cma` on `any`)
    **+** [clevercanyon/skeleton-dev-deps](https://github.com/clevercanyon/skeleton-dev-deps)

## Naming Convention

All skeleton repos should have a name in this format, at minimum.

-   `clevercanyon/skeleton`.`[app-type]`.`[target-env]`

Skeleton variants should use a `.` separator preceding their slug.

-   `clevercanyon/skeleton`.`[app-type]`.`[target-env]`.`[variant]`

## All Possible Combinations

Our build system supports `appType` on `targetEnv` directives. However, not all combinations actually make sense. For example, we're not likely to create a `mpa` app and target a `webw` environment. The same with a `mpa` on `any`, because a multipage app needs to target something that will serve it as HTML. Likewise, creating a `cma` on `cfp` makes little sense. Instead, we'd create a `mpa` on `cfp` app.

### Multipage Apps

-   clevercanyon/skeleton.mpa `any`
-   clevercanyon/skeleton.mpa.cfp
-   clevercanyon/skeleton.mpa.cfw
-   clevercanyon/skeleton.mpa.node
-   clevercanyon/skeleton.mpa.web
-   clevercanyon/skeleton.mpa.webw
-   clevercanyon/skeleton.mpa.opl

### Custom Apps

-   clevercanyon/skeleton (`cma` on `any`)
-   clevercanyon/skeleton.cma.cfp
-   clevercanyon/skeleton.cma.cfw
-   clevercanyon/skeleton.cma.node
-   clevercanyon/skeleton.cma.web
-   clevercanyon/skeleton.cma.webw
-   clevercanyon/skeleton.cma.opl

## All Rational Combinations

These lists include those from above that actually make sense, at least in theory.

### Multipage Apps

-   clevercanyon/skeleton.mpa.cfp
-   clevercanyon/skeleton.mpa.cfw
-   clevercanyon/skeleton.mpa.node
-   clevercanyon/skeleton.mpa.web

### Custom Apps

-   clevercanyon/skeleton (`cma` on `any`)
-   clevercanyon/skeleton.cma.cfw
-   clevercanyon/skeleton.cma.node
-   clevercanyon/skeleton.cma.web
-   clevercanyon/skeleton.cma.webw
-   clevercanyon/skeleton.cma.opl

## Skeletons We Actually Need

What do we really care about most, or will likely need?

### Multipage Apps

-   [clevercanyon/skeleton.mpa.cfp](#): Multipage or single-page React apps with static assets, functions, routes, middleware, and more. This covers most of our needs for general sites, services, and even purpose-built apps.

### Custom Apps

-   [clevercanyon/skeleton](https://github.com/clevercanyon/skeleton) (`cma` on `any`)

    -   Base skeleton that all others extend in some way and have their dotfiles updated by.

-   [clevercanyon/skeleton.cma.cfw](#)

    -   Purpose-built Cloudflare workers for backend APIs and microservices. Let's create this skeleton along with variants that cover common use cases; e.g., scheduled events.

-   [clevercanyon/skeleton.cma.node](#)

    -   NPM packages targeting Node. Let's create this skeleton along with variants that cover common use cases; e.g., CLI tools.

-   [clevercanyon/skeleton.cma.web](#)

    -   NPM packages targeting web browsers. Let's create this skeleton along with variants that cover common use cases; e.g., UI, React components.

-   [clevercanyon/skeleton.cma.webw](#)
    -   NPM packages. Scaffolding for workers that run in a browser.
