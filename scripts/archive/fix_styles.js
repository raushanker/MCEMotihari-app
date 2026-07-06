const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', 'create.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// I need to find the styles block and make sure imageActionButtons exists
if (!content.includes('imageActionButtons: {')) {
  // Wait, did my previous patch fail to match?
  // Let's add it explicitly if it's missing.
  content = content.replace(
    'imagePreview: {',
    `imageActionButtons: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  imageActionBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {`
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed styles in create.tsx');
} else {
  console.log('Styles already exist!');
}
