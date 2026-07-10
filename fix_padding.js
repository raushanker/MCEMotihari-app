const fs = require('fs');
const file = 'src/app/(tabs)/community.tsx';
let content = fs.readFileSync(file, 'utf8');

// Change padding to 0 for Android when keyboard is closed
content = content.replace(
  "paddingBottom: isKeyboardVisible ? 10 : insets.bottom",
  "paddingBottom: Platform.OS === 'ios' ? insets.bottom : (isKeyboardVisible ? 8 : 0)"
);

fs.writeFileSync(file, content);
console.log("Fixed community.tsx padding");
