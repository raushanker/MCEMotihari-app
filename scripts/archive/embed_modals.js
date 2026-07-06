const fs = require('fs');
const path = require('path');

const modals = [
  'CampusMapModal.tsx',
  'NotepadModal.tsx',
  'AboutModal.tsx',
  'EventsModal.tsx',
  'HolidaysModal.tsx',
  'ResultsWebModal.tsx',
  'StudyMaterialsModal.tsx'
];

modals.forEach(modalName => {
  const filePath = path.join(__dirname, 'src', 'components', 'modals', modalName);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add isEmbedded to Props
  const propsMatch = content.match(/interface \w+Props \{/);
  if (propsMatch && !content.includes('isEmbedded?: boolean;')) {
    content = content.replace(propsMatch[0], `${propsMatch[0]}\n  isEmbedded?: boolean;`);
  }

  // 2. Add isEmbedded to component signature
  // e.g. export function CampusMapModal({ visible, onClose }: CampusMapModalProps)
  // or export function EventsModal({ visible, onClose, ... }: EventsModalProps)
  const sigMatch = content.match(/export function (\w+)\(\{\s*visible,\s*onClose(.*?)\}\s*:\s*\w+Props\)\s*\{/);
  if (sigMatch && !sigMatch[0].includes('isEmbedded')) {
      const newSig = sigMatch[0].replace('visible, onClose', 'visible, onClose, isEmbedded');
      content = content.replace(sigMatch[0], newSig);
  } else if (!sigMatch) {
      console.log(`Signature match failed for ${modalName}`);
  }

  // 3. Wrap return <Modal> with isEmbedded check
  // Find `return (` followed by `<Modal`
  // Some modals might just do `return <Modal` or `return (\n    <Modal`
  if (content.includes('isEmbedded')) {
      // Find the first return statement that returns a Modal
      const returnModalRegex = /return\s*\(\s*<Modal[^>]*>([\s\S]*?)<\/Modal>\s*\);/m;
      const match = content.match(returnModalRegex);
      if (match) {
          const innerContent = match[1];
          const newReturn = `
  if (isEmbedded) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        ${innerContent}
      </View>
    );
  }

  return (
    <Modal${match[0].split('<Modal')[1]}
`;
          content = content.replace(match[0], newReturn);
      } else {
         console.log(`Failed to find return <Modal> in ${modalName}`);
      }
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Processed all modals');
