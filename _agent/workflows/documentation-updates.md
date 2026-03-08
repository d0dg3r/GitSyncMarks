---
description: Mandatory Documentation Updates for Releases & Architectural Changes
---

Every time mission-critical code (Sync Engine, Context Menu, Storage, API) is modified or a new release is prepared, follow these steps to ensure documentation consistency:

1. **CHANGELOG.md**:
   - Create a new version entry if not already present.
   - Document all **Fixed**, **Added**, **Improved**, and **Changed** items.
   - Update the comparison links at the bottom of the file.

2. **docs/ARCHITECTURE.md**:
   - Update the Mermaid diagram if new components or connections were added.
   - Add/Update component descriptions in the "Component Descriptions" section.
   - Ensure the "Technology Stack" and "File Structure" sections reflect current reality.

3. **README.md**:
   - Update the "Upgrading to..." section for major/minor releases.
   - Verify feature lists and visual tours match current implementation.
   - Bump version numbers where explicitly mentioned.

4. **Version Manifests**:
   - Bump version in `package.json`.
   - Bump version in `manifest.json`.
   - Ensure versions are synchronized across both files.

5. **Website Docs**:
   - Run `node scripts/build-docs.js` to propagate markdown changes to the `_site/` directory.

// turbo-all
6. **Automation**:
   - Run `npm run build` to verify the project still compiles/assembles correctly.
