# Contributing

Thanks for your interest in contributing to `@namelesserlx/editor`.

## Development Setup

This repository is an ESM monorepo built with `pnpm` workspaces.

Requirements:

- Node.js `>=22`
- `pnpm` `11.x`

Install dependencies:

```bash
pnpm install
```

Start local development:

```bash
pnpm dev
```

Useful commands:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Project Layout

- `packages/editor`: publishable editor package
- `apps/playground`: local consumer app for validating package behavior

## Pull Requests

Before opening a pull request, please:

1. Keep changes focused and avoid unrelated refactors.
2. Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`.
3. Update docs when behavior or public APIs change.
4. Add or update tests when fixing bugs or changing package behavior.

## Commit Message Convention

This repository uses Conventional Commits.

Examples:

- `feat: add readonly renderer locale fallback`
- `fix: normalize markdown export for nested task lists`
- `docs: refresh package README examples`
- `chore: update workspace tooling`

Commit messages are validated with `commitlint`, and staged files are checked with `lint-staged` through `husky` hooks.

## Commit Scope

Good contributions for this repository include:

- editor API improvements
- React integration improvements
- readonly rendering fixes
- HTML / Markdown conversion fixes
- i18n updates
- documentation improvements
- tooling and developer experience improvements

If you plan a larger change, opening an issue first is a good way to align on scope.
