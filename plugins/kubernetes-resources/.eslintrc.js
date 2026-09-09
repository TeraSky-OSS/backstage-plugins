module.exports = require('@backstage/cli/config/eslint-factory')(__dirname, {
  // Migrated to @backstage/ui (BUI) — see MUI_TO_BUI_MIGRATION.md. `@material-ui/core` is not
  // fully banned here: `Drawer` and `useTheme` remain as documented exceptions (no BUI Drawer
  // equivalent; react-syntax-highlighter/react-flow-renderer need real JS theme values).
  restrictedImports: ['@material-ui/lab'],
  restrictedImportPatterns: ['@material-ui/icons/*'],
});
