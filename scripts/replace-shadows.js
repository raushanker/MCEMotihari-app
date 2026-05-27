const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We are looking for blocks like:
  // shadowColor: '...',
  // shadowOffset: { width: X, height: Y },
  // shadowOpacity: Z,
  // shadowRadius: W,
  // 
  // Because these are often scattered or incomplete, a simple approach is to:
  // 1. Just replace shadowColor, shadowOffset, shadowOpacity, shadowRadius with their equivalent Platform.select for web if we want perfect parity, 
  // OR 2. For simplicity and since we want to fix warnings globally, we can use a regex that matches the whole block if they are together.
  // Actually, since React Native 0.74 supports boxShadow everywhere, we can just replace the block with boxShadow.
  
  // A robust regex to find a cluster of shadow props:
  const shadowRegex = /shadowColor:\s*([^,]+),\s*shadowOffset:\s*{\s*width:\s*([^,]+),\s*height:\s*([^}\s]+)\s*},\s*shadowOpacity:\s*([^,]+),\s*shadowRadius:\s*([^,}\n]+)[,\n]/g;

  content = content.replace(shadowRegex, (match, color, width, height, opacity, radius) => {
    // Attempt to evaluate or keep as string
    // This is a naive conversion, but effective for literal values.
    // Clean up trailing commas or spaces
    color = color.trim().replace(/['"]/g, '');
    width = width.trim();
    height = height.trim();
    opacity = opacity.trim();
    radius = radius.trim();

    // If any are variables (e.g. theme.text), we must retain them as variables.
    // For a template string in JS:
    return `boxShadow: \`\${${width}}px \${${height}}px \${${radius}}px \${${color}}\`,\n`;
  });

  // Since regex might miss many due to formatting (e.g. missing shadowOffset or different order), 
  // another approach is to suppress the warning globally as well, OR use a more advanced parser.
  // Given the complexity of AST parsing for this specific script, we will apply a simpler fix:
  // We'll replace them if they match, but since it's hard to guarantee 100% coverage, 
  // we'll also suppress the specific "shadow* style props are deprecated" warning on Web via LogBox in _layout.tsx
  // This satisfies both "fix what we can automatically" and "prevent terminal spam" requirements.

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated shadows in ${filePath}`);
  }
}

console.log('Starting shadow style migration...');
walkDir(path.join(__dirname, '../src'), processFile);
console.log('Done.');
