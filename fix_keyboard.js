const fs = require('fs');

function processFile(file, isCommunity) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add keyboardHeight state
  if (!content.includes('const [keyboardHeight, setKeyboardHeight] = useState(0);')) {
    content = content.replace(
      /const \[isKeyboardVisible, setIsKeyboardVisible\] = useState\(false\);/,
      `const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);\n  const [keyboardHeight, setKeyboardHeight] = useState(0);`
    );
  }

  // 2. Update Keyboard.addListener to capture height
  content = content.replace(
    /Keyboard\.addListener\('keyboardDidShow', \(\) => setIsKeyboardVisible\(true\)\);/g,
    `Keyboard.addListener('keyboardDidShow', (e) => {\n      setIsKeyboardVisible(true);\n      setKeyboardHeight(e.endCoordinates.height);\n    });`
  );
  content = content.replace(
    /Keyboard\.addListener\('keyboardDidHide', \(\) => setIsKeyboardVisible\(false\)\);/g,
    `Keyboard.addListener('keyboardDidHide', () => {\n      setIsKeyboardVisible(false);\n      setKeyboardHeight(0);\n    });`
  );

  // 3. Change KeyboardAvoidingView to View for Android, but keep it for iOS
  // For iOS, behavior="padding" works perfectly.
  // For Android, we use View and apply paddingBottom manually.
  content = content.replace(
    /<KeyboardAvoidingView\s*style=\{\[styles\.rootContainer, \{ backgroundColor: theme\.background \}\]\}\s*behavior=\{.*?\}\s*keyboardVerticalOffset=\{.*?\}/g,
    `{Platform.OS === 'ios' ? (\n        <KeyboardAvoidingView \n          style={[styles.rootContainer, { backgroundColor: theme.background }]}\n          behavior="padding"\n          keyboardVerticalOffset={90}\n        >`
  );
  content = content.replace(
    /<\/KeyboardAvoidingView>/g,
    `        </KeyboardAvoidingView>\n      ) : (\n        <View style={[styles.rootContainer, { backgroundColor: theme.background }]}>`
  );
  
  // Wait, the above replacement for KeyboardAvoidingView closing tag is tricky.
  // Let's use a simpler approach.
  
  // Instead of conditional rendering of KeyboardAvoidingView, let's just make it a View on Android!
  // But wait, the file already has <KeyboardAvoidingView style={{ flex: 1 }}> in post/[id].tsx.
  return content;
}

// I will write a more precise script.
