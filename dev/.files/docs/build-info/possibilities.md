# `appType` + `targetEnv` Possibilities

## Default Skeleton + Dependencies

-   [clevercanyon/skeleton](https://github.com/clevercanyon/skeleton) (`cma` on `any`)
    -   [clevercanyon/dev-deps](https://github.com/clevercanyon/dev-deps)

## Naming Convention

All skeleton repos should have a name in this format, at minimum.

-   `clevercanyon/skeleton`.`[app-type]`.`[target-env]`

Skeleton variants should use a `.` separator preceding their slug.

-   `clevercanyon/skeleton`.`[app-type]`.`[target-env]`.`[variant]`

## All Possible Combinations

Our build system supports `appType` on `targetEnv` directives. However, not all combinations actually make sense. For example, we're not likely to create a `mpa` app and target a `webw` environment. The same with an `mpa` on `any`, because a multipage app needs to target something that will serve it as HTML. Likewise, creating a `cma` on `cfp` makes little sense. Instead, we'd create an `spa` or `mpa` on `cfp` app.

### Single-Page Apps

-   clevercanyon/skeleton.spa `any`
-   clevercanyon/skeleton.spa.node
-   clevercanyon/skeleton.spa.cfw
-   clevercanyon/skeleton.spa.cfp
-   clevercanyon/skeleton.spa.web
-   clevercanyon/skeleton.spa.webw

### Multipage Apps

-   clevercanyon/skeleton.mpa `any`
-   clevercanyon/skeleton.mpa.node
-   clevercanyon/skeleton.mpa.cfw
-   clevercanyon/skeleton.mpa.cfp
-   clevercanyon/skeleton.mpa.web
-   clevercanyon/skeleton.mpa.webw

### Custom Apps

-   clevercanyon/skeleton (`cma` on `any`)
-   clevercanyon/skeleton.cma.node
-   clevercanyon/skeleton.cma.cfw
-   clevercanyon/skeleton.cma.cfp
-   clevercanyon/skeleton.cma.web
-   clevercanyon/skeleton.cma.webw

### Library Apps

-   clevercanyon/skeleton.lib `any`
-   clevercanyon/skeleton.lib.node
-   clevercanyon/skeleton.lib.cfw
-   clevercanyon/skeleton.lib.cfp
-   clevercanyon/skeleton.lib.web
-   clevercanyon/skeleton.lib.webw

## All Rational Combinations

These lists include those from above that actually make sense, at least in theory.

### Single-Page Apps

-   clevercanyon/skeleton.spa.node
-   clevercanyon/skeleton.spa.cfw
-   clevercanyon/skeleton.spa.cfp
-   clevercanyon/skeleton.spa.web

### Multipage Apps

-   clevercanyon/skeleton.mpa.node
-   clevercanyon/skeleton.mpa.cfw
-   clevercanyon/skeleton.mpa.cfp
-   clevercanyon/skeleton.mpa.web

### Custom Apps

-   clevercanyon/skeleton (`cma` on `any`)
-   clevercanyon/skeleton.cma.node
-   clevercanyon/skeleton.cma.cfw
-   clevercanyon/skeleton.cma.cfp
-   clevercanyon/skeleton.cma.web
-   clevercanyon/skeleton.cma.webw

### Library Apps

-   clevercanyon/skeleton.lib `any`
-   clevercanyon/skeleton.lib.node
-   clevercanyon/skeleton.lib.cfw
-   clevercanyon/skeleton.lib.cfp
-   clevercanyon/skeleton.lib.web
-   clevercanyon/skeleton.lib.webw

## Skeletons We Actually Need

What do we really care about most, or will likely need?

### Single-Page Apps

-   [clevercanyon/skeleton.spa.cfp](https://github.com/clevercanyon/skeleton.spa.cfp): Single-page Preact apps with static assets, functions, routes, middleware, and more. This covers most of our needs for general sites, services, and even purpose-built apps.

### Custom Apps (Easily Converted To Libs As Needed)

-   [clevercanyon/skeleton](https://github.com/clevercanyon/skeleton) (`cma` on `any`)

    -   Base skeleton that all others have their dotfiles updated by.

-   [clevercanyon/skeleton.cma.node](https://github.com/clevercanyon/skeleton.cma.node)

    -   Apps targeting Node. Let's create this skeleton along with variants that cover common use cases; e.g., CLI tools.

-   [clevercanyon/skeleton.cma.cfw](https://github.com/clevercanyon/skeleton.cma.cfw)

    -   Apps targeting Cloudflare workers for backend APIs. Let's create this skeleton along with variants that cover common use cases; e.g., scheduled events.

-   [clevercanyon/skeleton.cma.web](https://github.com/clevercanyon/skeleton.cma.web)

    -   Apps targeting web browsers. Let's create this skeleton along with variants that cover common use cases; e.g., DOM manipulation and other purely web-focused components.

-   [clevercanyon/skeleton.cma.webw](https://github.com/clevercanyon/skeleton.cma.webw)
    -   Apps targeting workers that run in a browser.
