module.exports = require('@backstage/cli/config/eslint-factory')(__dirname, {
  restrictedImports: ['@material-ui/icons', '@material-ui/lab'],
  restrictedImportPatterns: ['@material-ui/icons/*'],
});
