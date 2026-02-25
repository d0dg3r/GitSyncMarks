# Help Translate GitSyncMarks

GitSyncMarks is a browser extension that syncs bookmarks with GitHub. It currently supports **12 languages**, and we welcome help improving existing translations or adding new ones.

**No programming skills required.** You only need a free GitHub account and a web browser.

## Current Languages

| Code | Language | Status |
|---|---|---|
| `en` | English | Complete (reference) |
| `de` | Deutsch | Complete |
| `fr` | Français | Complete |
| `es` | Español | Complete |
| `pt_BR` | Português (Brasil) | Needs review |
| `it` | Italiano | Needs review |
| `ja` | 日本語 | Needs review |
| `zh_CN` | 中文 (简体) | Needs review |
| `ko` | 한국어 | Needs review |
| `ru` | Русский | Needs review |
| `tr` | Türkçe | Needs review |
| `pl` | Polski | Needs review |

"Needs review" means the translation was auto-generated and would benefit from a native speaker's review.

---

## How the Translation Files Work

Each language has one file: `_locales/{code}/messages.json`

The file is a list of entries. Each entry has a **key** (do not change) and a **message** (translate this):

```json
{
  "popup_syncNow": {
    "message": "Sync Now"
  },
  "popup_lastSync": {
    "message": "Last sync: $1"
  }
}
```

### Rules

1. **Only change the `"message"` values.** Never rename the keys (like `popup_syncNow`).
2. **Keep placeholders like `$1`, `$2`.** These are filled in at runtime. Example: `"Last sync: $1"` becomes `"Last sync: 2 minutes ago"`. Move them to where they fit your language's grammar.
3. **Keep HTML tags intact.** Some messages contain `<code>`, `<a href="...">`, `<br>`. Keep these exactly as they are and only translate the text around them.
4. **Do not translate technical terms:** GitHub, JSON, YAML, PAT, GitSyncMarks, README.md, bookmarks.html, feed.xml, dashy-conf.yml, Push, Pull, Sync.
5. **`extName` always stays `"GitSyncMarks"`.** This is the extension name shown in the browser.
6. **Keep translations concise.** UI buttons and labels have limited space.

---

## Improve an Existing Translation

This is the easiest way to help. You can do everything in your browser on GitHub.

### Step by step

1. Go to the GitSyncMarks repository: `https://github.com/d0dg3r/GitSyncMarks`
2. Navigate to `_locales/{code}/messages.json` (e.g., `_locales/de/messages.json` for German)
3. Click the **pencil icon** (Edit this file) in the top-right corner of the file view
4. Find the string you want to improve and change its `"message"` value
5. Scroll down and click **"Propose changes"**
6. On the next page, click **"Create pull request"**
7. Add a short title like "Fix German translation for sync button" and submit

A pull request (PR) is a proposal to change the file. A maintainer will review and merge it.

### How to find a specific string

If you see a wrong translation in the extension but don't know which key it is:

1. Open `_locales/en/messages.json` (the English reference file)
2. Search for the English text you see in the UI (use Ctrl+F / Cmd+F)
3. Note the key name (e.g., `popup_syncNow`)
4. Open your language's file and search for the same key
5. Fix the `"message"` value

---

## Add a New Language

Adding a completely new language takes more effort (328 strings to translate), but still requires no programming.

### Step by step

1. **Fork the repository**: Click "Fork" on the GitSyncMarks GitHub page. This creates your own copy.
2. **Create a new folder**: In your fork, navigate to `_locales/` and create a new folder with your language code (e.g., `hi` for Hindi, `nl` for Dutch). Use [Chrome's supported locale codes](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales).
3. **Copy the English file**: Copy the contents of `_locales/en/messages.json` into a new file `messages.json` inside your new folder.
4. **Translate all 328 `"message"` values**: Work through the file and translate each message. Leave keys, placeholders, and HTML tags untouched.
5. **Create a pull request**: When done, submit a PR from your fork to the main repository.
6. **In the PR description**, please include:
   - The language name in its native script (e.g., "हिन्दी" for Hindi)
   - Whether it is a complete or partial translation

A maintainer will register the new language in the codebase (one small code change in `lib/i18n.js`) so it appears in the settings dropdown. You do not need to do this yourself.

### Tips for a new language

- Translate the most visible strings first: anything starting with `popup_`, `options_tab`, or `contextMenu_`
- Use the extension in English to see where each string appears — the key prefixes (`popup_`, `options_`, `sync_`, `help_`) tell you which page the string belongs to
- Partial translations are welcome. Missing strings automatically fall back to English.

---

## Tips for Good Translations

- **Be consistent**: Use the same word for the same concept throughout (e.g., always "Lesezeichen" in German, not sometimes "Bookmarks")
- **Match the tone**: The UI is informal and direct. Short sentences, no unnecessary formality.
- **Test context**: The key prefix tells you where the string appears:
  - `popup_` — the small popup when clicking the extension icon
  - `options_` — the settings page
  - `sync_` — sync status messages and notifications
  - `help_` — the Help tab
  - `contextMenu_` — right-click menu items
  - `api_` / `serializer_` — error messages (shown in notifications)

---

## Questions?

- Open a [Discussion](https://github.com/d0dg3r/GitSyncMarks/discussions) if you are unsure about a translation
- Check [Issues](https://github.com/d0dg3r/GitSyncMarks/issues) for open translation-related tasks
- See [docs/I18N.md](I18N.md) for the technical i18n architecture (aimed at developers)
