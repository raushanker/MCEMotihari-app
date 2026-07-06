const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Check if the file imports TextInput from react-native
  const importRegex = /import\s+({[^}]*})\s+from\s+['"]react-native['"]/g;
  
  content = content.replace(importRegex, (match, importsStr) => {
    // If it doesn't import TextInput, leave it alone
    if (!/\bTextInput\b/.test(importsStr)) {
      return match;
    }
    
    // Remove TextInput from the destructured imports
    let newImportsStr = importsStr
      .replace(/\bTextInput\b\s*,?/, '') // Remove TextInput and optional comma
      .replace(/,\s*}/, ' }') // Cleanup trailing comma before }
      .replace(/{\s*,/, '{ ') // Cleanup leading comma after {
      .replace(/{\s*}/, '');  // If empty, we can just remove it, but let's be safe
      
    let replacement = '';
    if (newImportsStr.trim() !== '') {
      replacement = `import ${newImportsStr} from 'react-native';\nimport { TextInput } from '@/components/ui/TextInput';`;
    } else {
      replacement = `import { TextInput } from '@/components/ui/TextInput';`;
    }
    return replacement;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (stat.isFile() && filePath.endsWith('.tsx') && !filePath.includes('components/ui/TextInput.tsx')) {
      processFile(filePath);
    }
  }
}

walkDir(path.join(__dirname, 'src'));
