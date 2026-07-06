const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'UserProfileModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add MaterialIcons import
if (!content.includes('MaterialIcons')) {
  content = content.replace(
    "import { Ionicons } from '@expo/vector-icons';",
    "import { Ionicons, MaterialIcons } from '@expo/vector-icons';"
  );
}

// Add the blue tick logic next to the user name
const nameLine = `<Text style={[styles.profileName, { color: theme.text, textAlign: 'center' }]}>{p.name}</Text>`;
const newNameBlock = `<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Text style={[styles.profileName, { color: theme.text, textAlign: 'center' }]}>{p.name}</Text>
                  {(p.id === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || p.id === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || p.adminRole === 'SUPER_ADMIN') && (
                    <MaterialIcons name="verified" size={20} color="#1D9BF0" style={{ marginTop: 2 }} />
                  )}
                </View>`;

if (content.includes(nameLine)) {
  content = content.replace(nameLine, newNameBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched UserProfileModal.tsx');
} else {
  console.log('Could not find name rendering line in UserProfileModal.tsx');
}
