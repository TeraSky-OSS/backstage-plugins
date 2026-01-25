#!/usr/bin/env node

/**
 * Cleanup script for newly scaffolded Backstage plugins
 *
 * Removes example components with mock data and renames the main component
 * to match the plugin name, leaving a clean plugin structure ready for development.
 *
 * Usage:
 *   node scripts/cleanup-scaffolding.js <plugin-path>
 *
 * Example:
 *   node scripts/cleanup-scaffolding.js ../demo/plugins/my-plugin
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const pluginPath = process.argv[2];

if (!pluginPath) {
  console.error('❌ Usage: node cleanup-scaffolding.js <plugin-path>');
  console.error('   Example: node cleanup-scaffolding.js ../demo/plugins/my-plugin');
  process.exit(1);
}

// Helper: Convert kebab-case to PascalCase
function toPascalCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

console.log('🧹 Cleaning up scaffolding junk from plugin...');
console.log(`📁 Plugin path: ${pluginPath}`);

// Check if plugin directory exists
if (!fs.existsSync(pluginPath)) {
  console.error(`❌ Plugin directory not found: ${pluginPath}`);
  process.exit(1);
}

// Check if it's a Backstage plugin
const packageJsonPath = path.join(pluginPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ No package.json found - not a valid plugin directory');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const pluginId = packageJson.backstage?.pluginId;

if (!pluginId) {
  console.error('❌ No pluginId found in package.json - not a valid Backstage plugin');
  process.exit(1);
}

const pluginName = toPascalCase(pluginId);
const componentName = `${pluginName}Page`;

console.log(`🔧 Plugin ID: ${pluginId}`);
console.log(`📝 Component name: ${componentName}`);

try {
  const componentsDir = path.join(pluginPath, 'src', 'components');
  const exampleComponentDir = path.join(componentsDir, 'ExampleComponent');
  const newComponentDir = path.join(componentsDir, componentName);

  // Step 1: Remove ExampleFetchComponent (300+ lines of junk)
  console.log('\n📦 Removing junk components...');

  const exampleFetchDir = path.join(componentsDir, 'ExampleFetchComponent');
  if (fs.existsSync(exampleFetchDir)) {
    console.log('  - Removing ExampleFetchComponent/ (mock data junk)');
    fs.rmSync(exampleFetchDir, { recursive: true, force: true });
  }

  // Step 2: Rename ExampleComponent to match plugin name
  console.log('\n🔄 Renaming ExampleComponent to match plugin...');

  if (fs.existsSync(exampleComponentDir)) {
    console.log(`  - Renaming ExampleComponent/ → ${componentName}/`);
    fs.renameSync(exampleComponentDir, newComponentDir);

    // Step 3: Update component file content
    console.log('  - Updating component file...');

    const componentFilePath = path.join(newComponentDir, 'ExampleComponent.tsx');
    const newComponentFilePath = path.join(newComponentDir, `${componentName}.tsx`);

    if (fs.existsSync(componentFilePath)) {
      let content = fs.readFileSync(componentFilePath, 'utf8');

      // Remove ExampleFetchComponent import
      content = content.replace(/import \{ ExampleFetchComponent \} from ['"]\.\.\/ExampleFetchComponent['"'];?\n?/g, '');

      // Remove ExampleFetchComponent from JSX
      content = content.replace(/\s*<Grid item>\s*<ExampleFetchComponent \/>\s*<\/Grid>\s*/g, '');

      // Rename component export
      content = content.replace(/export const ExampleComponent/g, `export const ${componentName}`);

      // Write to new file name
      fs.writeFileSync(newComponentFilePath, content);

      // Remove old file
      fs.unlinkSync(componentFilePath);
      console.log(`    ✅ ExampleComponent.tsx → ${componentName}.tsx`);
    }

    // Step 4: Update test file
    const testFilePath = path.join(newComponentDir, 'ExampleComponent.test.tsx');
    const newTestFilePath = path.join(newComponentDir, `${componentName}.test.tsx`);

    if (fs.existsSync(testFilePath)) {
      let testContent = fs.readFileSync(testFilePath, 'utf8');

      // Update imports
      testContent = testContent.replace(/from ['"]\.\/ExampleComponent['"]/g, `from './${componentName}'`);
      testContent = testContent.replace(/ExampleComponent/g, componentName);

      fs.writeFileSync(newTestFilePath, testContent);
      fs.unlinkSync(testFilePath);
      console.log(`    ✅ ExampleComponent.test.tsx → ${componentName}.test.tsx`);
    }

    // Step 5: Update index.ts
    const indexPath = path.join(newComponentDir, 'index.ts');
    if (fs.existsSync(indexPath)) {
      let indexContent = fs.readFileSync(indexPath, 'utf8');

      indexContent = indexContent.replace(/from ['"]\.\/ExampleComponent['"]/g, `from './${componentName}'`);
      indexContent = indexContent.replace(/ExampleComponent/g, componentName);

      fs.writeFileSync(indexPath, indexContent);
      console.log(`    ✅ index.ts updated`);
    }
  }

  // Step 6: Update plugin.ts
  console.log('\n🔧 Updating plugin.ts...');

  const pluginFilePath = path.join(pluginPath, 'src', 'plugin.ts');
  if (fs.existsSync(pluginFilePath)) {
    let pluginContent = fs.readFileSync(pluginFilePath, 'utf8');

    // Update import path
    pluginContent = pluginContent.replace(
      /import\(['"]\.\/components\/ExampleComponent['"]\)/g,
      `import('./components/${componentName}')`
    );

    // Update component reference in import
    pluginContent = pluginContent.replace(/m\.ExampleComponent/g, `m.${componentName}`);

    fs.writeFileSync(pluginFilePath, pluginContent);
    console.log(`  ✅ Updated imports to use ${componentName}`);
  }

  // Step 7: Remove other junk files
  console.log('\n🗑️  Removing other junk files...');

  const devDir = path.join(pluginPath, 'dev');
  if (fs.existsSync(devDir)) {
    console.log('  - Removing dev/');
    fs.rmSync(devDir, { recursive: true, force: true });
  }

  const pluginTestPath = path.join(pluginPath, 'src', 'plugin.test.ts');
  if (fs.existsSync(pluginTestPath)) {
    console.log('  - Removing plugin.test.ts');
    fs.unlinkSync(pluginTestPath);
  }

  console.log('\n✨ Cleanup complete!');
  console.log('\n📝 What changed:');
  console.log(`  - Removed ExampleFetchComponent (300+ lines of mock data)`);
  console.log(`  - Renamed ExampleComponent → ${componentName}`);
  console.log(`  - Updated all imports and references`);
  console.log(`  - Removed dev/ and example tests`);
  console.log('\n🚀 Next steps:');
  console.log('  1. Update src/plugin.ts to use the New Frontend System');
  console.log('  2. Customize the component in src/components/${componentName}/');
  console.log('  3. Follow the conversion steps in backstage-frontend-plugin/SKILL.md');

} catch (error) {
  console.error('\n❌ Cleanup failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
