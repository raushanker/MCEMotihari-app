const fs = require('fs');
const path = require('path');

// 1. Add danger and error to theme.ts
const themePath = path.join(__dirname, 'src', 'constants', 'theme.ts');
let themeContent = fs.readFileSync(themePath, 'utf8');
if (!themeContent.includes("danger: '#EF4444'")) {
  themeContent = themeContent.replace(/cardBorder:\s*'[#A-F0-9]+',?/g, "$&\n    danger: '#EF4444',\n    error: '#EF4444',");
  fs.writeFileSync(themePath, themeContent, 'utf8');
}

// 2. Fix 'TextInput' refers to a value in post/[id].tsx, search.tsx, CreatePostModal.tsx
const filesToFixTextInputType = [
  'src/app/post/[id].tsx',
  'src/app/search.tsx',
  'src/components/modals/CreatePostModal.tsx'
];

for (const file of filesToFixTextInputType) {
  const fp = path.join(__dirname, file);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    // We imported TextInput from ui/TextInput, so we need RNTextInput for the ref type
    if (!content.includes("import { TextInput as RNTextInput }")) {
      content = content.replace(/import\s*\{\s*([^}]*)\s*\}\s*from\s*'react-native';/g, (match, imports) => {
        if (!imports.includes('TextInput as RNTextInput') && !imports.includes('RNTextInput')) {
          return match.replace(imports, imports + ', TextInput as RNTextInput');
        }
        return match;
      });
      content = content.replace(/useRef<TextInput>/g, 'useRef<RNTextInput>');
      fs.writeFileSync(fp, content, 'utf8');
    }
  }
}

// 3. Fix ExploreMenuModal.tsx and support.tsx - "tnp" is not assignable to "hub" | "departments" ...
// We need to add "tnp" to the type definition. Where is the type definition for this?
// It's probably in the ExploreMenuModal or somewhere else. Wait, let's just use `as any` or fix the type.
