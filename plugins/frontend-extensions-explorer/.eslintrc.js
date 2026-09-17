module.exports = require('@backstage/cli/config/eslint-factory')(__dirname, {
  // Migrated to @backstage/ui (BUI) — see MUI_TO_BUI_MIGRATION.md. `@material-ui/core` is not
  // fully banned here: `Drawer` remains as a documented exception (no BUI Drawer equivalent).
  restrictedImports: ['@material-ui/lab'],
  restrictedImportPatterns: ['@material-ui/icons/*'],
});
