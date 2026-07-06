const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'NotepadModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The return block starts at:
//   return (
//     <>
//       <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
//       <View style={styles.modalOverlay}>
//         <TouchableOpacity 
//           style={StyleSheet.absoluteFillObject} 
//           activeOpacity={1} 
//           onPress={onClose} 
//         />
//         
//         <View style={[styles.bottomSheet, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
//           <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />

const returnRegex = /return \(\s*<>\s*<Modal visible=\{visible\} animationType="slide" transparent onRequestClose=\{onClose\}>\s*<View style=\{styles\.modalOverlay\}>\s*<TouchableOpacity\s*style=\{StyleSheet\.absoluteFillObject\}\s*activeOpacity=\{1\}\s*onPress=\{onClose\}\s*\/>\s*<View style=\{\[styles\.bottomSheet, \{ backgroundColor: theme\.background, borderColor: theme\.cardBorder \}\]\}>\s*<View style=\{\[styles\.sheetHandle, \{ backgroundColor: theme\.cardBorder \}\]\} \/>/;

if (content.match(returnRegex)) {
    content = content.replace(returnRegex, `
  const mainContent = (
    <View style={[isEmbedded ? { flex: 1 } : styles.bottomSheet, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
      {!isEmbedded && <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />}
`);

    // Now we need to find where </View> </Modal> is closed.
    const modalCloseRegex = /<\/View>\s*<\/Modal>/;
    
    content = content.replace(modalCloseRegex, `
  );

  return (
    <>
      {isEmbedded ? (
        mainContent
      ) : (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFillObject} 
              activeOpacity={1} 
              onPress={onClose} 
            />
            {mainContent}
          </View>
        </Modal>
      )}
`);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully patched NotepadModal');
} else {
    console.log('Failed to match return block');
}
