const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'profile.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add MaterialIcons import
if (!content.includes('MaterialIcons')) {
  content = content.replace(
    "import { Ionicons } from '@expo/vector-icons';",
    "import { Ionicons, MaterialIcons } from '@expo/vector-icons';"
  );
}

// Find the Ionicons checkmark-circle block next to user name
const oldBadge = `<Ionicons 
                name="checkmark-circle" 
                size={22} 
                color="#3B82F6" 
                style={{ marginLeft: 6, marginTop: 2 }} 
              />`;

const newBadge = `<MaterialIcons 
                name="verified" 
                size={20} 
                color="#1D9BF0" 
                style={{ marginLeft: 6, marginTop: 2 }} 
              />`;

if (content.includes(oldBadge)) {
  content = content.replace(oldBadge, newBadge);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched profile.tsx badge');
} else {
  console.log('Could not find Ionicons checkmark-circle badge in profile.tsx');
}
