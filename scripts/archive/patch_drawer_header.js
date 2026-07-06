const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'drawer', 'DrawerHeader.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add MaterialIcons import
if (!content.includes('MaterialIcons')) {
  content = content.replace(
    "import { Ionicons } from '@expo/vector-icons';",
    "import { Ionicons, MaterialIcons } from '@expo/vector-icons';"
  );
}

// Add the blue tick logic next to the user name
const nameLine = '<Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{user.name}</Text>';
const newNameBlock = `<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{user.name}</Text>
            {(user.uid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || user.uid === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || user.adminRole === 'SUPER_ADMIN') && (
              <MaterialIcons name="verified" size={18} color="#1D9BF0" />
            )}
          </View>`;

if (content.includes(nameLine)) {
  content = content.replace(nameLine, newNameBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched DrawerHeader.tsx');
} else {
  console.log('Could not find name rendering line in DrawerHeader.tsx');
}
