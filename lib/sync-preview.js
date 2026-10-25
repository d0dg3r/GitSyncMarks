/**
 * Sync preview: how many bookmarks a push or pull would add and remove.
 * Bookmarks are compared by URL (a moved or renamed bookmark is not a delete plus an add).
 */

/**
 * Count bookmarks in `to` that are not in `from` (added) and the reverse (removed).
 * Duplicates count: two copies of a URL in `from` and one in `to` is one removal.
 * @param {Object<string, string>} from - File map (path → content)
 * @param {Object<string, string>} to - File map (path → content)
 * @param {(path: string) => boolean} isBookmarkFile - Which paths are bookmark payloads
 * @returns {{added: number, removed: number}}
 */
export function summarizeBookmarkDifference(from, to, isBookmarkFile) {
  const urlsOf = (files) => {
    const counts = new Map();
    for (const [path, content] of Object.entries(files)) {
      if (!isBookmarkFile(path)) continue;
      let url = null;
      try {
        url = JSON.parse(content)?.url || null;
      } catch {
        url = null;
      }
      if (!url) continue;
      counts.set(url, (counts.get(url) || 0) + 1);
    }
    return counts;
  };
  const fromCounts = urlsOf(from);
  const toCounts = urlsOf(to);
  let added = 0;
  let removed = 0;
  for (const [url, count] of toCounts) {
    added += Math.max(0, count - (fromCounts.get(url) || 0));
  }
  for (const [url, count] of fromCounts) {
    removed += Math.max(0, count - (toCounts.get(url) || 0));
  }
  return { added, removed };
}
