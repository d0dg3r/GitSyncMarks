/**
 * Applies the popup's per-file conflict choices to the merge result.
 * "local" keeps this browser's version (pushed to the repository, deletion included),
 * "remote" keeps the repository's version (applied locally). Conflicts without a choice
 * are returned so the sync can ask again.
 *
 * A rename conflict has two paths: localPath (where this browser has the bookmark) and
 * remotePath (where the repository has it). The chosen version is written at its own path,
 * and the other side's renamed copy is removed.
 */

/**
 * @param {Array<{path: string, localPath?: string, remotePath?: string, local: string|null, remote: string|null}>} conflicts
 * @param {Object<string, 'local'|'remote'>} choices - conflict path → choice
 * @param {Object<string, string|null>} toPush - Changes to push; updated in place
 * @param {Object<string, string|null>} toApplyLocal - Changes to apply locally; updated in place
 * @returns {Array<object>} Unresolved conflicts
 */
export function applyConflictChoices(conflicts, choices, toPush, toApplyLocal) {
  const unresolved = [];
  for (const conflict of conflicts) {
    const choice = choices[conflict.path];
    const localPath = conflict.localPath ?? conflict.path;
    const remotePath = conflict.remotePath ?? conflict.path;
    if (choice === 'local') {
      toPush[localPath] = conflict.local;
      if (remotePath !== localPath && conflict.remote !== null) toPush[remotePath] = null;
    } else if (choice === 'remote') {
      toApplyLocal[remotePath] = conflict.remote;
      if (remotePath !== localPath && conflict.local !== null) toApplyLocal[localPath] = null;
    } else {
      unresolved.push(conflict);
    }
  }
  return unresolved;
}
