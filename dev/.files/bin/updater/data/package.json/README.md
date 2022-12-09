## `package.json` Updates

Note that `"workspaces": []` is important for two reasons.

1. We want to avoid monorepos like the plague. Too much complexity!
2. We do however, need to signal that `package.json` is the workspace root for Vite.
   See: <https://o5p.me/6DBiLC>.
