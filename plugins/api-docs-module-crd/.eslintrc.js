module.exports = require('@backstage/cli/config/eslint-factory')(__dirname, {
  // Migrated to @backstage/ui (BUI) — see MUI_TO_BUI_MIGRATION.md. Do not reintroduce MUI here.
  restrictedImports: ['@material-ui/core', '@material-ui/lab'],
  restrictedImportPatterns: ['@material-ui/*'],
});
