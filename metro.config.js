const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Push cjs extension for Firebase compatibility
config.resolver.sourceExts.push('cjs');

// Disable package exports to prevent double bundling of Firebase submodules
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
