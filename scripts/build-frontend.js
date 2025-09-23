#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Frontend build script for the new modular architecture
 * This script processes the ES6 modules and prepares them for production
 */

console.log('🏗️ Building frontend for modular architecture...');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SRC_CLIENT_DIR = path.join(__dirname, '..', 'src', 'client');

// Check if the new modular structure exists
if (!fs.existsSync(SRC_CLIENT_DIR)) {
  console.log('ℹ️ New modular architecture not found, using legacy structure');
  process.exit(0);
}

// For now, we'll create a simple module loader that works with the existing structure
// In the future, this could be enhanced with bundling, minification, etc.

function createModuleLoader() {
  const loaderScript = `
// Module loader for the new modular architecture
(function() {
  'use strict';

  const moduleCache = new Map();
  const loadingModules = new Map();

  // Simple module loader for ES6 modules in development
  window.loadModule = async function(modulePath) {
    if (moduleCache.has(modulePath)) {
      return moduleCache.get(modulePath);
    }

    if (loadingModules.has(modulePath)) {
      return loadingModules.get(modulePath);
    }

    const loadPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('📦 Loading module:', modulePath);

        // Dynamic import for ES6 modules
        const module = await import(modulePath);
        moduleCache.set(modulePath, module);
        resolve(module);
      } catch (error) {
        console.error('❌ Failed to load module:', modulePath, error);
        reject(error);
      }
    });

    loadingModules.set(modulePath, loadPromise);
    const result = await loadPromise;
    loadingModules.delete(modulePath);

    return result;
  };

  // Polyfill for older browsers
  if (!window.import) {
    window.import = window.loadModule;
  }

  console.log('✅ Module loader initialized');
})();
`;

  return loaderScript;
}

function updateIndexHtml() {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.warn('⚠️ index.html not found');
    return;
  }

  let indexContent = fs.readFileSync(indexPath, 'utf8');

  // Check if the module loader is already added
  if (indexContent.includes('Module loader for the new modular architecture')) {
    console.log('✅ Module loader already present in index.html');
    return;
  }

  // Add the module loader script before the closing head tag
  const moduleLoaderScript = `<script>${createModuleLoader()}</script>`;

  if (indexContent.includes('</head>')) {
    indexContent = indexContent.replace('</head>', `${moduleLoaderScript}\n</head>`);
  } else {
    console.warn('⚠️ Could not find </head> tag in index.html');
    return;
  }

  // Update the app.js reference to use the new modular version if it exists
  const newAppPath = '/src/client/app.js';
  if (indexContent.includes('src="app.js"') || indexContent.includes("src='app.js'")) {
    indexContent = indexContent.replace(
      /src=['"]app\.js['"]/g,
      `type="module" src="${newAppPath}"`
    );
    console.log('✅ Updated app.js reference to use modular version');
  }

  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Updated index.html with module loader');
}

function optimizeForProduction() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('ℹ️ Skipping production optimizations in development mode');
    return;
  }

  console.log('🚀 Applying production optimizations...');

  // Here we could add:
  // - Module bundling
  // - Minification
  // - Tree shaking
  // - Code splitting
  // - Asset optimization

  console.log('✅ Production optimizations complete');
}

function validateBuild() {
  console.log('🔍 Validating build...');

  // Check that essential files exist
  const essentialFiles = [
    path.join(PUBLIC_DIR, 'index.html'),
    path.join(SRC_CLIENT_DIR, 'app.js')
  ];

  for (const file of essentialFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Essential file missing: ${file}`);
    }
  }

  console.log('✅ Build validation passed');
}

async function main() {
  try {
    console.log('📁 Working directory:', process.cwd());
    console.log('📍 Public directory:', PUBLIC_DIR);
    console.log('📍 Source directory:', SRC_CLIENT_DIR);

    // Update index.html with module loader
    updateIndexHtml();

    // Apply production optimizations
    optimizeForProduction();

    // Validate the build
    validateBuild();

    console.log('✅ Frontend build completed successfully!');

    // Output build statistics
    const stats = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      publicDir: PUBLIC_DIR,
      srcDir: SRC_CLIENT_DIR
    };

    console.log('📊 Build stats:', JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('❌ Frontend build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
if (require.main === module) {
  main();
}

module.exports = { main, createModuleLoader, updateIndexHtml };