const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dept-room.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('pickMediaWithOptions')) {
    content = content.replace(
        "import { uploadToCloudinary } from '@/utils/cloudinary';",
        "import { uploadToCloudinary } from '@/utils/cloudinary';\nimport { pickMediaWithOptions } from '@/utils/mediaPicker';"
    );
}

// 2. Change ImagePicker.launchImageLibraryAsync to pickMediaWithOptions
content = content.replace(
    "const result = await ImagePicker.launchImageLibraryAsync({",
    "const result = await pickMediaWithOptions({"
);

// 3. Change uploadToCloudinary to include 'low'
content = content.replace(
    "const url = await uploadToCloudinary(uri);",
    "const url = await uploadToCloudinary(uri, 'low');"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched dept-room.tsx');
