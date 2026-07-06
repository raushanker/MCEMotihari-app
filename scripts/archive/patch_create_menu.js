const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const insertBlock = `
              <TouchableOpacity 
                style={styles.createMenuItem}
                onPress={() => {
                  setIsCreateMenuVisible(false);
                  if (!user || user.role === 'Guest') {
                    setIsFastLoginVisible(true);
                    return;
                  }
                  router.push('/olx/create');
                }}
              >
                <View style={[styles.createMenuIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="pricetags" size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.createMenuText, { color: theme.text }]}>Sell 2nd Hand Item</Text>
              </TouchableOpacity>
`;

const marker = '<Text style={[styles.createMenuText, { color: theme.text }]}>Post Requirements</Text>\n              </TouchableOpacity>';

if (content.includes(marker)) {
    content = content.replace(marker, marker + '\n' + insertBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully added Sell 2nd Hand Item to the plus menu');
} else {
    console.log('Could not find the marker to insert the new option');
}
