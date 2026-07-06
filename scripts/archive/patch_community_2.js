const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'community.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    "const result = await ImagePicker.launchImageLibraryAsync({",
    "const result = await pickMediaWithOptions({"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched community.tsx');
