const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'DetailModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('isEmbedded?: boolean;')) {
  content = content.replace('interface DetailModalProps {', 'interface DetailModalProps {\n  isEmbedded?: boolean;');
}

const sigMatch = content.match(/export function DetailModal\(\{\s*visible,\s*title,\s*onClose,\s*children,\s*refreshControl,\s*disableScroll,\s*fullHeight\s*\}\s*:\s*DetailModalProps\)\s*\{/);
if (sigMatch) {
    const newSig = sigMatch[0].replace('fullHeight }', 'fullHeight, isEmbedded }');
    content = content.replace(sigMatch[0], newSig);
}

const returnModalRegex = /return\s*\(\s*<Modal[^>]*>([\s\S]*?)<\/Modal>\s*\);/m;
const match = content.match(returnModalRegex);
if (match) {
    const innerContent = match[1];
    const newReturn = `
  if (isEmbedded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundElement }}>
        ${innerContent}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      ${innerContent}
    </Modal>
  );
`;
    content = content.replace(match[0], newReturn.trim());
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched DetailModal');
