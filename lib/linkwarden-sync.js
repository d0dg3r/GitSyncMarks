/**
 * Linkwarden Sync – Collections and Links as bookmarks folders
 *
 * Fetches collections and links from Linkwarden API and maintains
 * a "Linkwarden" folder with subfolders for each collection.
 */

import { detectRootFolderRole } from './bookmark-serializer.js';
import { LinkwardenAPI } from './linkwarden-api.js';

/**
 * Find the root folder ID for a given role (toolbar, other, menu).
 * @param {string} parentRole
 * @returns {Promise<string|null>} Folder ID or null
 */
async function getRootFolderIdForRole(parentRole) {
    const tree = await chrome.bookmarks.getTree();
    const rootChildren = tree[0]?.children || [];
    for (const folder of rootChildren) {
        const role = detectRootFolderRole(folder);
        if (role === parentRole) return folder.id;
    }
    return null;
}

/**
 * Find or create a subfolder under the given parent.
 * @param {string} parentId - Parent folder ID
 * @param {string} folderTitle - Title of the folder
 * @returns {Promise<string>} Folder ID
 */
async function findOrCreateFolder(parentId, folderTitle) {
    const children = await chrome.bookmarks.getChildren(parentId);
    const existing = children.find((c) => !c.url && c.title === folderTitle);
    if (existing) return existing.id;

    const folder = await chrome.bookmarks.create({
        parentId,
        title: folderTitle,
    });
    return folder.id;
}

/**
 * Update the Linkwarden folder with the current collections and links.
 * @param {string} url - Linkwarden Instance URL
 * @param {string} token - Linkwarden API token (decrypted)
 * @param {string} parentRole - 'toolbar' | 'other'
 * @returns {Promise<{collections: number, links: number}>}
 */
export async function updateLinkwardenCollectionsFolder(url, token, parentRole) {
    const api = new LinkwardenAPI(url, token);

    // 1. Fetch data from Linkwarden
    const collectionsRes = await api.getCollections();
    const linksRes = await api.getLinks(); // Fetch all links (up to 1000)

    const collections = collectionsRes?.response || [];
    const allLinks = linksRes?.response || [];

    // 2. Prepare Parent Folder
    const effectiveRole = parentRole === 'menu' ? 'other' : parentRole;
    const rootId = await getRootFolderIdForRole(effectiveRole);
    if (!rootId) {
        throw new Error(`Root folder not found for role: ${parentRole}`);
    }

    const lwFolderId = await findOrCreateFolder(rootId, 'Linkwarden');

    // 3. Process Collections
    const collectionMap = new Map();
    collectionMap.set(null, { name: 'Unorganized', id: null, links: [] });
    for (const c of collections) {
        collectionMap.set(c.id, { name: c.name, id: c.id, links: [] });
    }

    // Distribute links to collections
    for (const link of allLinks) {
        const colId = link.collection?.id || null;
        if (collectionMap.has(colId)) {
            collectionMap.get(colId).links.push(link);
        } else {
            collectionMap.get(null).links.push(link);
        }
    }

    // 4. Sync Folders and Bookmarks
    const existingCollectionFolders = await chrome.bookmarks.getChildren(lwFolderId);
    const folderByTitle = new Map();
    for (const f of existingCollectionFolders) {
        if (!f.url) folderByTitle.set(f.title, f);
    }

    let totalLinks = 0;

    for (const [colId, data] of collectionMap) {
        if (data.links.length === 0 && colId === null) continue; // Skip empty Unorganized

        const folderId = await findOrCreateFolder(lwFolderId, data.name);

        // Sync links in this folder
        const existingLinks = await chrome.bookmarks.getChildren(folderId);
        const bookmarkByUrl = new Map();
        for (const b of existingLinks) {
            if (b.url) bookmarkByUrl.set(b.url, b);
        }

        const targetLinks = new Map();
        for (const link of data.links) {
            targetLinks.set(link.url, link.name || link.url);
        }

        // Add/Update
        for (const [linkUrl, linkTitle] of targetLinks) {
            const existing = bookmarkByUrl.get(linkUrl);
            if (!existing) {
                await chrome.bookmarks.create({ parentId: folderId, title: linkTitle, url: linkUrl });
            } else if (existing.title !== linkTitle) {
                await chrome.bookmarks.update(existing.id, { title: linkTitle });
            }
        }

        // Remove
        for (const b of existingLinks) {
            if (b.url && !targetLinks.has(b.url)) {
                await chrome.bookmarks.remove(b.id);
            }
        }

        totalLinks += data.links.length;
        folderByTitle.delete(data.name); // Mark as kept
    }

    // Remove folders that no longer exist in Linkwarden
    for (const folder of folderByTitle.values()) {
        await chrome.bookmarks.removeTree(folder.id);
    }

    return { collections: collections.length, links: totalLinks };
}
