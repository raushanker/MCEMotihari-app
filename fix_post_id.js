const fs = require('fs');
const file = 'src/app/post/[id].tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add isKeyboardVisible state
if (!content.includes('const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);')) {
  content = content.replace(
    /const \[commentText, setCommentText\] = useState\(''\);/,
    `const [commentText, setCommentText] = useState('');\n  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);`
  );
}

// 2. Add useEffect for Keyboard
if (!content.includes('Keyboard.addListener')) {
  content = content.replace(
    /useEffect\(\(\) => \{/,
    `useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);\n\n  useEffect(() => {`
  );
}

// 3. Update KeyboardAvoidingView
content = content.replace(
  "behavior={Platform.OS === 'ios' ? 'padding' : undefined}",
  "behavior={'padding'}"
);
content = content.replace(
  "keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}",
  "keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}"
);

// 4. Update inputStickyBar
content = content.replace(
  "paddingVertical: 10,",
  "paddingTop: 10,\n    paddingBottom: Platform.OS === 'ios' ? 10 : 0,"
);

// 5. Add dynamic padding to the View that uses styles.inputStickyBar
content = content.replace(
  "<View style={[styles.inputStickyBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.cardBorder }]}>",
  "<View style={[styles.inputStickyBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.cardBorder, paddingBottom: Platform.OS === 'ios' ? 10 : (isKeyboardVisible ? 8 : 0) }]}>"
);

fs.writeFileSync(file, content);
console.log("Fixed post/[id].tsx padding");
