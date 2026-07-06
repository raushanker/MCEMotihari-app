const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'NotepadModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `  if (isEmbedded) {
    return (
      <>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Header */}
          <View style={[styles.sheetHeader, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, paddingTop: Platform.OS === 'ios' ? 40 : 16 }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.hubIconContainer, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.12)' : '#FFF7ED' }]}>
                <Ionicons name="journal-sharp" size={20} color="#F97316" />
              </View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Academic Notepad & Hub</Text>
            </View>
            <View style={styles.headerRightRow}>
              <TouchableOpacity 
                onPress={onClose}
                style={styles.closeButtonIcon}
              >
                <Text style={[styles.sheetClose, { color: theme.textSecondary, fontSize: 24, lineHeight: 24 }]}>←</Text>
              </TouchableOpacity>
            </View>
          </View>
`;

const match = content.match(/return\s*\(\s*<>\s*<Modal\s*visible=\{visible\}[\s\S]*?\{\/\* Header \*\/\}\s*<View style=\{\[styles\.sheetHeader[\s\S]*?<TouchableOpacity/);
if (match) {
    const splitPoint = match[0].lastIndexOf('<TouchableOpacity');
    const firstPart = match[0].substring(0, splitPoint);
    
    // We want to insert the isEmbedded conditional return right before the `return (`
    const returnRegex = /return\s*\(\s*<>\s*<Modal\s*visible=\{visible\}/;
    const returnMatch = content.match(returnRegex);
    
    if (returnMatch) {
       // Find the end of the embedded part by matching everything from the <TouchableOpacity after Header Right Row to the end of the View 
       // Actually it's easier to just do a string replacement on `return (`
       
       let newContent = content.replace(returnRegex, 
         `if (isEmbedded) {
    return (
      <>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Header */}
          <View style={[styles.sheetHeader, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, paddingTop: Platform.OS === 'ios' ? 40 : 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.hubIconContainer, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.12)' : '#FFF7ED' }]}>
                <Ionicons name="journal-sharp" size={20} color="#F97316" />
              </View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Academic Notepad</Text>
            </View>
            <View style={styles.headerRightRow}>
              <TouchableOpacity onPress={onClose} style={{ padding: 8, marginRight: -8 }}>
                <Text style={[styles.sheetClose, { color: theme.textSecondary, fontSize: 24, lineHeight: 24 }]}>←</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Embedded Content Uses the exact same body! We just copy the body down to the bottomSheet closing tag */}
`);
       
       // Now we need to extract the exact body content of the modal.
       // It starts AFTER </View> (the headerRightRow View closing) </View> (the sheetHeader closing)
       // Let's find the body by reading the file manually using regex
    }
}
