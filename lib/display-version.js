/**
 * Display version for About tab and debug exports.
 * Set during develop/3.0; release builds may overwrite via scripts/build.sh.
 * Null = use manifest version only.
 */
export const DISPLAY_VERSION = '3.0.0-dev';

/**
 * @param {string} manifestVersion
 * @returns {string}
 */
export function getAppVersion(manifestVersion) {
  return DISPLAY_VERSION ?? manifestVersion;
}
