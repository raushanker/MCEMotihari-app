const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldFab = `        onPress={() => {
          if (!user || user.role === 'Guest') {
            setFastLoginVisible(true);
          } else {
            router.push('/olx/create' as any);
          }
        }}`;

const newFab = `        onPress={() => {
          if (!user || user.role === 'Guest') {
            setFastLoginVisible(true);
          } else {
            if (onCreateClick) {
              onCreateClick();
            } else {
              router.push('/olx/create' as any);
            }
          }
        }}`;

if (content.includes(oldFab)) {
  content = content.replace(oldFab, newFab);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched olx/index.tsx FAB');
} else {
  console.log('Could not find old FAB code in olx/index.tsx');
}
