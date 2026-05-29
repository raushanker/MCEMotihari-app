const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const srcDir = path.resolve(__dirname, '../src');

walkDir(srcDir, filePath => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  
  // We only check files that have "Platform" in their content but don't import Platform,
  // or files that use Platform.OS for boxShadow but are missing the import.
  if (!content.includes('Platform.OS')) return;

  // Let's check if Platform is imported from 'react-native' or "react-native"
  // Safe check: does the file import Platform from react-native?
  let hasPlatformImport = false;
  
  // Look for any import of Platform from 'react-native' or "react-native"
  let rnImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]react-native['"]/;
  let rnImportMatch = content.match(rnImportRegex);
  
  if (rnImportMatch) {
    let imports = rnImportMatch[1];
    if (imports.includes('Platform')) {
      hasPlatformImport = true;
    } else {
      // Add Platform to the imports list
      let updatedImports = `Platform, ${imports.trim()}`;
      let newImportStatement = rnImportMatch[0].replace(imports, updatedImports);
      content = content.replace(rnImportRegex, newImportStatement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Successfully added Platform to import in: ${filePath}`);
    }
  } else {
    // If react-native import is not found at all, prepend it
    content = `import { Platform } from 'react-native';\n` + content;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Prepended Platform import to: ${filePath}`);
  }
});
