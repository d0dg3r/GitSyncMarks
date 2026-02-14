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

## Security Considerations

GitSyncMarks handles sensitive data:

- **GitHub Personal Access Token** — stored encrypted (AES-256-GCM) in browser local storage; only sent to `api.github.com`
- **Bookmarks** — synced to your GitHub repository; no third-party servers
- **No analytics or tracking** — see [PRIVACY.md](PRIVACY.md)
