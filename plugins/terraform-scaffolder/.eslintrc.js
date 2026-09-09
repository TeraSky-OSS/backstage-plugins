module.exports = require('@backstage/cli/config/eslint-factory')(__dirname, {
  // Migrated to @backstage/ui (BUI) — see MUI_TO_BUI_MIGRATION.md. Do not reintroduce direct MUI
  // imports here. Note: @material-ui/core and @material-ui/icons remain in package.json
  // dependencies because @rjsf/material-ui (used via withTheme) requires them as peer deps —
  // that is a documented exception, not a violation of this rule.
  restrictedImports: ['@material-ui/core', '@material-ui/lab'],
  restrictedImportPatterns: ['@material-ui/*'],
});
