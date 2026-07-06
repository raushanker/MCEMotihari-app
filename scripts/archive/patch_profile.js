const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'profile.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { getOptimizedImageUrl, uploadToCloudinary } from '@/utils/cloudinary';",
  "import { getOptimizedImageUrl, uploadToCloudinary } from '@/utils/cloudinary';\nimport { pickMediaWithOptions } from '@/utils/mediaPicker';"
);

content = content.replace(
  "const result = await launchMediaPicker({",
  "const result = await pickMediaWithOptions({"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched profile.tsx');
