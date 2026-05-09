# Changelog

## 0.1.0

- Rebuilt the package as `@namelesserlx/editor`.
- Added JSON-first editor and readonly renderer APIs.
- Added HTML / Markdown import-export helpers.
- Added DOMPurify-based HTML sanitizing and URL policy helpers.
- Added built-in `en-US` and `zh-CN` locale support.
- Added default toolbar, bubble menu, link popover, and color picker UI.
- Removed the built-in slash menu so `/` command UX can be owned by consumer extensions.
- Added opt-in iframe embeds with HTTPS host allowlist policy.
- Added Markdown custom syntax and format performance regression tests.
- Added bundle size verification for package entry points and `/readonly` boundaries.
- Removed blog-specific presets and legacy editor APIs.
- Kept upload and codeless extension integrations outside the package boundary.
