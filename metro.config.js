const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Push cjs extension for Firebase compatibility
config.resolver.sourceExts.push('cjs');

// Disable package exports to prevent double bundling of Firebase submodules
config.resolver.unstable_enablePackageExports = false;

// Enable inline requires for faster startup time
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
