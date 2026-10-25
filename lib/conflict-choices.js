/**
 * Applies the popup's per-file conflict choices to the merge result.
 * "local" keeps this browser's version (pushed to the repository, deletion included),
 * "remote" keeps the repository's version (applied locally). Conflicts without a choice
 * are returned so the sync can ask again.
 */

/**
 * @param {Array<{path: string, local: string|null, remote: string|null}>} conflicts
 * @param {Object<string, 'local'|'remote'>} choices - path → choice
 * @param {Object<string, string|null>} toPush - Changes to push; updated in place
 * @param {Object<string, string|null>} toApplyLocal - Changes to apply locally; updated in place
 * @returns {Array<{path: string, local: string|null, remote: string|null}>} Unresolved conflicts
 */
export function applyConflictChoices(conflicts, choices, toPush, toApplyLocal) {
  const unresolved = [];
  for (const conflict of conflicts) {
    const choice = choices[conflict.path];
    if (choice === 'local') toPush[conflict.path] = conflict.local;
    else if (choice === 'remote') toApplyLocal[conflict.path] = conflict.remote;
    else unresolved.push(conflict);
  }
  return unresolved;
}
