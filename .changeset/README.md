# Changesets

This folder stores release notes for packages managed by Changesets.

When a change should publish a new `@namelesserlx/editor` version, run:

```bash
pnpm changeset
```

Choose `@namelesserlx/editor`, select the semver bump, and describe the user-facing change.

When you are ready to publish from a local machine that is logged in to npm:

```bash
pnpm version-packages
git add .changeset packages/editor/package.json packages/editor/CHANGELOG.md
git commit -m "chore: version packages"
pnpm release
```
