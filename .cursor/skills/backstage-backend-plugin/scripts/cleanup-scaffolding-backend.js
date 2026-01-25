#!/usr/bin/env node

/**
 * Cleanup script for newly scaffolded Backstage backend plugins
 *
 * Removes example todo service and simplifies router to just a /health endpoint,
 * leaving a clean backend plugin structure ready for development.
 *
 * Usage:
 *   node scripts/cleanup-scaffolding-backend.js <plugin-path>
 *
 * Example:
 *   node scripts/cleanup-scaffolding-backend.js ../demo/plugins/my-backend-backend
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const pluginPath = process.argv[2];

if (!pluginPath) {
  console.error('❌ Usage: node cleanup-scaffolding-backend.js <plugin-path>');
  console.error('   Example: node cleanup-scaffolding-backend.js ../demo/plugins/my-backend-backend');
  process.exit(1);
}

console.log('🧹 Cleaning up backend scaffolding junk...');
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

console.log(`🔧 Plugin ID: ${pluginId}`);

try {
  // Step 1: Remove example services directory
  console.log('\n📦 Removing example services...');

  const servicesDir = path.join(pluginPath, 'src', 'services');
  if (fs.existsSync(servicesDir)) {
    console.log('  - Removing services/ (TodoListService with 150+ lines)');
    fs.rmSync(servicesDir, { recursive: true, force: true });
  }

  // Step 2: Simplify router.ts to just /health
  console.log('\n🔧 Simplifying router.ts...');

  const routerPath = path.join(pluginPath, 'src', 'router.ts');
  if (fs.existsSync(routerPath)) {
    const simpleRouter = `import { HttpAuthService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';

export interface RouterOptions {
  httpAuth: HttpAuthService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  // Mark options as used to satisfy TypeScript when no auth is wired yet
  void options;

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return router;
}
`;

    fs.writeFileSync(routerPath, simpleRouter);
    console.log('  ✅ Replaced with simple /health endpoint');
  }

  // Step 3: Update plugin.ts to remove todoList dependency
  console.log('\n🔧 Updating plugin.ts...');

  const pluginFilePath = path.join(pluginPath, 'src', 'plugin.ts');
  if (fs.existsSync(pluginFilePath)) {
    let pluginContent = fs.readFileSync(pluginFilePath, 'utf8');

    // Remove todoList import
    pluginContent = pluginContent.replace(/import \{ todoListServiceRef \} from ['"]\.\/services\/TodoListService['"'];?\n?/g, '');

    // Remove todoList from deps
    pluginContent = pluginContent.replace(/\s*todoList: todoListServiceRef,?\n?/g, '');

    // Remove todoList from init params
    pluginContent = pluginContent.replace(/,?\s*todoList\s*,?/g, '');

    // Clean up the createRouter call
    pluginContent = pluginContent.replace(
      /await createRouter\(\{\s*httpAuth,?\s*\}\)/g,
      'await createRouter({ httpAuth })'
    );

    fs.writeFileSync(pluginFilePath, pluginContent);
    console.log('  ✅ Removed todoList service dependency');
  }

  // Step 4: Remove test files
  console.log('\n🗑️  Removing example tests...');

  const pluginTestPath = path.join(pluginPath, 'src', 'plugin.test.ts');
  if (fs.existsSync(pluginTestPath)) {
    console.log('  - Removing plugin.test.ts');
    fs.unlinkSync(pluginTestPath);
  }

  const routerTestPath = path.join(pluginPath, 'src', 'router.test.ts');
  if (fs.existsSync(routerTestPath)) {
    console.log('  - Removing router.test.ts');
    fs.unlinkSync(routerTestPath);
  }

  // Step 5: Remove dev directory
  const devDir = path.join(pluginPath, 'dev');
  if (fs.existsSync(devDir)) {
    console.log('  - Removing dev/');
    fs.rmSync(devDir, { recursive: true, force: true });
  }

  console.log('\n✨ Cleanup complete!');
  console.log('\n📝 What changed:');
  console.log('  - Removed services/TodoListService.ts (150+ lines of example code)');
  console.log('  - Simplified router.ts to just /health endpoint');
  console.log('  - Removed todoList service from plugin.ts');
  console.log('  - Removed example tests (plugin.test.ts, router.test.ts)');
  console.log('  - Removed dev/ directory');
  console.log('\n🚀 Next steps:');
  console.log('  1. Add your own routes in src/router.ts');
  console.log('  2. Create services if needed in src/services/');
  console.log('  3. Follow backstage-backend-plugin/SKILL.md for best practices');
  console.log(`\n📍 Test with: curl http://localhost:7007/api/${pluginId}/health`);

} catch (error) {
  console.error('\n❌ Cleanup failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
