const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'community.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { launchMediaPicker } from '@/utils/mediaPicker';",
  "import { pickMediaWithOptions } from '@/utils/mediaPicker';"
);

content = content.replace(
  "const result = await launchMediaPicker({",
  "const result = await pickMediaWithOptions({"
);

content = content.replace(
  "const uploadedUrl = await uploadToCloudinary(uri);",
  "const uploadedUrl = await uploadToCloudinary(uri, 'low');"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched community.tsx');
