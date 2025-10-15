# Version Bumping Guide

## Automated Version Bumping Script

The `bump-versions.sh` script automates the process of bumping versions for all plugins in this repository.

### Usage

```bash
./bump-versions.sh
```

### What the Script Does

1. **Runs Backstage CLI Version Bump**
   - Executes `yarn backstage-cli versions:bump` to update Backstage dependencies

2. **Bumps Plugin Versions**
   - For each plugin under `plugins/`:
     - Checks git diff to determine what changed in `package.json`
     - **Minor version bump** if `dependencies` changed
     - **Patch version bump** if only `devDependencies` changed or no changes
     - Updates the version in the plugin's `package.json`

3. **Updates Internal Dependencies**
   - Scans all plugins for `@terasky/*` dependencies
   - Updates these internal dependencies to the new versions that were just bumped

4. **Updates App and Backend Packages**
   - Updates `packages/app/package.json` with new plugin versions
   - Updates `packages/backend/package.json` with new plugin versions
   - Only modifies version numbers, doesn't add or remove dependencies

5. **Runs Yarn Install**
   - Executes `yarn install` to update lockfiles

### Output

The script provides colored output showing:
- ✅ **Success** messages in green
- ℹ️ **Info** messages in blue
- ⚠️ **Warning** messages in yellow
- ❌ **Error** messages in red

At the end, it displays a summary of all version changes.

### Requirements

- Node.js and yarn installed
- Git repository with committed changes (to detect diffs)
- All plugins should have valid `package.json` files

### Notes

- The script is safe to run multiple times
- It works on both Linux and macOS
- After running, don't forget to commit your changes:
  ```bash
  git add .
  git commit -m "chore: bump plugin versions"
  ```

### Troubleshooting

If the script fails:
1. Make sure you're in the repository root
2. Ensure all previous changes are committed
3. Check that `yarn` and `node` are available
4. Run `yarn install` manually if needed

### Manual Version Bumping

If you need to manually bump a specific plugin:

```bash
cd plugins/your-plugin
npm version patch  # or minor, major
```

Then run the script to update all dependent packages.

