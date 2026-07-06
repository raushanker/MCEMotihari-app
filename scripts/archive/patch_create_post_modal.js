const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'CreatePostModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update import
content = content.replace(
  "import { launchMediaPicker } from '@/utils/mediaPicker';",
  "import { pickMediaWithOptions } from '@/utils/mediaPicker';"
);

// 2. Update launchMediaPicker to pickMediaWithOptions
content = content.replace(
  "const result = await launchMediaPicker({",
  "const result = await pickMediaWithOptions({"
);

// 3. Update uploadToCloudinary
content = content.replace(
  "const uploadedUrl = await uploadToCloudinary(uri, controller.signal);",
  "const uploadedUrl = await uploadToCloudinary(uri, 'low', controller.signal);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched CreatePostModal.tsx');
