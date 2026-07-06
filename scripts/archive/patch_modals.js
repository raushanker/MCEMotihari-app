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

  // Add isEmbedded to Props
  const propsMatch = content.match(/interface \w+Props \{/);
  if (propsMatch && !content.includes('isEmbedded?: boolean;')) {
    content = content.replace(propsMatch[0], `${propsMatch[0]}\n  isEmbedded?: boolean;`);
  }

  // Add isEmbedded to function signature
  const sigMatch = content.match(/export function (\w+)\(\{\s*visible,\s*onClose(.*?)\}\s*:\s*\w+Props\)\s*\{/);
  if (sigMatch && !sigMatch[0].includes('isEmbedded')) {
      const newSig = sigMatch[0].replace('visible, onClose', 'visible, onClose, isEmbedded');
      content = content.replace(sigMatch[0], newSig);
  }

  // Pass isEmbedded to DetailModal
  if (content.includes('isEmbedded') && content.includes('<DetailModal')) {
      content = content.replace(/<DetailModal\s+visible={visible}/, '<DetailModal isEmbedded={isEmbedded} visible={visible}');
  }

  // Special cases for modals that don't use DetailModal or use it differently
  if (modalName === 'NotepadModal.tsx' && content.includes('<Modal')) {
      // NotepadModal uses a standard Modal, not DetailModal!
      // We will leave NotepadModal alone for now, or just patch DetailModal first.
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Patched modal files');
