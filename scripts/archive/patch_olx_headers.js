const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'src', 'app', 'olx', 'index.tsx');
let indexContent = fs.readFileSync(indexFile, 'utf8');

// Fix header in olx/index.tsx
indexContent = indexContent.replace(
  /<View style=\{styles\.headerTop\}>[\s\S]*?<\/View>\s*<\/View>/m,
  `<View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text, marginLeft: 12 }]}>Campus OLX</Text>
          </View>
          <TouchableOpacity onPress={showInfo} style={{ padding: 4, marginRight: -4 }}>
            <Ionicons name="information-circle-outline" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>`
);

// Fix header styles in olx/index.tsx
indexContent = indexContent.replace(
  /headerTitle: \{\s*fontSize: 20,\s*fontWeight: '700',\s*\}/,
  `headerTitle: {\n    fontSize: 20,\n    fontWeight: '800',\n    letterSpacing: -0.5,\n  }`
);

fs.writeFileSync(indexFile, indexContent);

const createFile = path.join(__dirname, 'src', 'app', 'olx', 'create.tsx');
let createContent = fs.readFileSync(createFile, 'utf8');

// Fix header styles in olx/create.tsx
createContent = createContent.replace(
  /headerTitle: \{\s*fontSize: 18,\s*fontWeight: '600',\s*\}/,
  `headerTitle: {\n    fontSize: 20,\n    fontWeight: '800',\n    letterSpacing: -0.5,\n  }`
);
createContent = createContent.replace(
  /headerTitle: \{\s*fontSize: 20,\s*fontWeight: 'bold',\s*\}/,
  `headerTitle: {\n    fontSize: 20,\n    fontWeight: '800',\n    letterSpacing: -0.5,\n  }`
);
createContent = createContent.replace(
  /<Text style=\{\[styles\.headerTitle, \{ color: theme\.text \}\]\}>Sell Item<\/Text>/,
  `<Text style={[styles.headerTitle, { color: theme.text, flex: 1, marginLeft: 12 }]}>Sell Item</Text>`
);

fs.writeFileSync(createFile, createContent);
console.log("Patched olx headers.");
