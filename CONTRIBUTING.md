# Contributing to GitSyncMarks

Contributions are welcome: bug reports, feature ideas, and pull requests. See [ROADMAP.md](ROADMAP.md) for planned work and ideas.

## Reporting bugs or feature ideas

Use [GitHub Issues](https://github.com/d0dg3r/GitSyncMarks/issues).

- **Bugs:** Include browser and extension version, steps to reproduce, and expected vs actual behavior.
- **Feature ideas:** Check [ROADMAP.md](ROADMAP.md) first; describe your use case and why it would help.

## Contributing code

### Dev setup

1. Clone the repository
2. Run `npm run build:chrome` or `npm run build:firefox`
3. Load the unpacked extension from `build/chrome/` or `build/firefox/` (see [docs/TESTING.md](docs/TESTING.md))

Optional: [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) and [Firefox DevTools MCP](https://github.com/mozilla/firefox-devtools-mcp) in **Cursor** (see [`.cursor/mcp.json`](.cursor/mcp.json) and [docs/TESTING.md](docs/TESTING.md#chrome-devtools-mcp-optional-cursor) / [Firefox section](docs/TESTING.md#firefox-devtools-mcp-optional-cursor)) for agent-assisted browser debugging. They do **not** replace Playwright E2E (`npm run test:e2e*`, Chrome only).

### Workflow

1. Create a branch from `main`: `feature/xyz` or `fix/xyz`
2. Implement your changes
3. Run `npm run lint`, `npm run typecheck` (TypeScript `checkJs` on selected `lib` modules; see [jsconfig.json](jsconfig.json)), and `npm run test:unit` before opening a PR
4. Test on Chrome and Firefox (see [docs/TESTING.md](docs/TESTING.md))
5. Open a pull request to `main`

CI runs the same lint, `typecheck`, unit tests, npm audit, and smoke E2E checks automatically on every PR to `main`.

For the full release process (versioning, tagging, store assets), see [docs/RELEASE.md](docs/RELEASE.md).

### Code style

Follow the existing code style. Keep changes focused and small where possible. ESLint with `eslint-plugin-security` enforces basic quality and security rules — run `npm run lint` locally to catch issues early.

### Translations

GitSyncMarks supports 12 languages. You can help improve translations or add new ones — no programming required. See the **[Translation Guide](docs/TRANSLATING.md)** for step-by-step instructions.

For the technical i18n architecture (developers), see [docs/I18N.md](docs/I18N.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
