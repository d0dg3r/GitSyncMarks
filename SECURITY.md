## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

Please **do not** report security vulnerabilities in public GitHub issues.

**How to report:**

1. Open a [GitHub Security Advisory](https://github.com/d0dg3r/GitSyncMarks/security/advisories/new) (recommended)
2. Or contact the maintainer privately via the email in your Git config or GitHub profile

**Please include:**

- Description of the vulnerability and steps to reproduce
- Affected version(s)
- Impact assessment

**What to expect:**

- We aim to respond within 48 hours
- We will acknowledge your report and keep you updated on the fix
- Coordinated disclosure: we will credit you in the advisory unless you prefer to remain anonymous

## Automated Security Scanning

The following tools run automatically in CI:

| Tool | Workflow | Trigger | Purpose |
|------|----------|---------|---------|
| **CodeQL** | `codeql.yml` | Push/PR to `main`, weekly schedule | JavaScript/TypeScript SAST (XSS, injection, prototype pollution) |
| **Dependency Review** | `dependency-review.yml` | PRs to `main` | Blocks PRs that introduce known-vulnerable dependencies |
| **npm audit** | `ci.yml` | Push/PR to `main` | Checks lockfile for published advisories |
| **ESLint + eslint-plugin-security** | `ci.yml` | Push/PR to `main` | Detects dangerous patterns (`eval`, `innerHTML`, non-literal `require`) |
| **Dependabot** | `dependabot.yml` | Weekly schedule | Opens PRs for outdated npm and GitHub Actions dependencies |

GitHub **secret scanning** is enabled at the repository level (default for public repos).

## Content Security Policy

Both `manifest.json` and `manifest.firefox.json` declare an explicit CSP for extension pages:

```
script-src 'self'; object-src 'none'
```

This prevents `eval()`, inline scripts, and remote script loading on all extension pages (options, popup).

## Permissions

| Permission | Justification |
|------------|---------------|
| `bookmarks` | Read/write bookmarks for sync |
| `storage` | Store settings and encrypted token |
| `alarms` | Schedule periodic auto-sync |
| `notifications` | Show sync status notifications |
| `contextMenus` | Right-click bookmark actions |
| `activeTab` | Save current tab as bookmark |
| `scripting` | Inject content scripts for bookmark actions |
| `downloads` | Export bookmarks as file |
| **host_permissions** `https://api.github.com/*` | GitHub API access for sync |
| **optional_host_permissions** `<all_urls>` (Chrome) / `https://*/* http://*/*` (Firefox) | Required only when Linkwarden integration is enabled; granted at runtime by user consent |

## Security Considerations

GitSyncMarks handles sensitive data:

- **GitHub Personal Access Token** — stored encrypted (AES-256-GCM) in browser local storage; only sent to `api.github.com`
- **Bookmarks** — synced to your GitHub repository; no third-party servers
- **No analytics or tracking** — see [PRIVACY.md](PRIVACY.md)
