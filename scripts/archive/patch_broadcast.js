const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'notanadmin', '(panel)', 'broadcast.tsx');
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
  "const uploadUrl = await uploadToCloudinary(imageUri);",
  "const uploadUrl = await uploadToCloudinary(imageUri, 'low');"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched broadcast.tsx');
