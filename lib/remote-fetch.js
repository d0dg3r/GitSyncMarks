/**
 * Remote file map fetching – fetches bookmark files from GitHub.
 * Extracted to avoid circular imports (profile-manager needs this without importing sync-engine).
 */

import { GitHubAPI, GitHubError } from './github-api.js';
import { gitTreeToShaMap } from './bookmark-serializer.js';

/**
 * Fetch the remote file map from GitHub.
 * @param {GitHubAPI} api
 * @param {string} basePath
 * @param {Object<string, {sha: string, content: string}>|null} baseFiles
 * @returns {Promise<{shaMap: object, fileMap: object, commitSha: string}|null>}
 */
export async function fetchRemoteFileMap(api, basePath, baseFiles) {
  let commitSha;
  try {
    commitSha = await api.getLatestCommitSha();
  } catch (err) {
    if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
      return null;
    }
    throw err;
  }

  const commit = await api.getCommit(commitSha);
  const treeEntries = await api.getTree(commit.treeSha);
  const shaMap = gitTreeToShaMap(treeEntries, basePath);

  if (Object.keys(shaMap).length === 0) {
    return { shaMap: {}, fileMap: {}, commitSha };
  }

  const fileMap = {};
  const fetchPromises = [];

  for (const [path, blobSha] of Object.entries(shaMap)) {
    if (baseFiles && baseFiles[path] && baseFiles[path].sha === blobSha) {
      fileMap[path] = baseFiles[path].content;
    } else {
      fetchPromises.push(
        api.getBlob(blobSha).then(content => {
          fileMap[path] = content;
        })
      );
    }
  }

  if (fetchPromises.length > 0) {
    await Promise.all(fetchPromises);
  }

  return { shaMap, fileMap, commitSha };
}
