const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'DetailModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `  if (isEmbedded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundElement }}>
        <View style={[styles.sheetHeader, { paddingTop: Math.max(16, insets.top) }]}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8, marginRight: -8 }}>
            <Text style={[styles.sheetClose, { color: theme.textSecondary, fontSize: 24, lineHeight: 24 }]}>←</Text>
          </TouchableOpacity>
        </View>
        {disableScroll ? (
          <View style={[styles.scrollContent, { flex: 1, paddingBottom: 20 }]}>
            {children}
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        )}
      </View>
    );
  }`;

// Find the isEmbedded block and replace it
const blockRegex = /if\s*\(isEmbedded\)\s*\{[\s\S]*?\}\s*return\s*\(\s*<Modal/m;
const match = content.match(blockRegex);
if (match) {
    content = content.replace(match[0], `${replacement}\n\n  return (\n    <Modal`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed DetailModal for isEmbedded');
} else {
    console.log('Regex failed');
}
