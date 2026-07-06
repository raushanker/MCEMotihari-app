const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update the container style to handle border radius when in modal (origin is present)
const containerStart = `<View style={[styles.container, { backgroundColor: theme.background }]}>`;
const newContainerStart = `<View style={[styles.container, { 
      backgroundColor: theme.background,
      ...(origin ? { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' } : {})
    }]}>`;

if (content.includes(containerStart)) {
  content = content.replace(containerStart, newContainerStart);
}

// Update header container style to also round its top if it has a different background
const headerStart = `<View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>`;
const newHeaderStart = `<View style={[styles.headerContainer, { 
        paddingTop: origin ? 24 : insets.top + 10, 
        backgroundColor: theme.backgroundElement, 
        borderBottomColor: theme.cardBorder,
        ...(origin ? { borderTopLeftRadius: 32, borderTopRightRadius: 32 } : {})
      }]}>`;

if (content.includes(headerStart)) {
  content = content.replace(headerStart, newHeaderStart);
}

// Update header top alignment and subtitle spacing
const headerTopOld = `<View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Campus OLX</Text>
          <TouchableOpacity onPress={showInfo} style={{ padding: 4, marginRight: -4 }}>
            <Ionicons name="information-circle-outline" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Buy & Sell 2nd Hand Items
        </Text>`;

const headerTopNew = `<View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Campus OLX</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary, marginTop: 4 }]}>
              Buy & Sell 2nd Hand Items
            </Text>
          </View>
          <TouchableOpacity onPress={showInfo} style={{ padding: 4, marginRight: -4 }}>
            <Ionicons name="information-circle-outline" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>`;

if (content.includes(headerTopOld)) {
  content = content.replace(headerTopOld, headerTopNew);
} else {
  console.log("Could not find headerTop segment");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched olx header');
