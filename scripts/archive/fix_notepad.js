const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'NotepadModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const returnRegex = /return\s*\(\s*<>\s*<Modal\s*visible=\{visible\}[\s\S]*?<\/Modal>\s*(?:\{isPdfVisible[\s\S]*?PdfViewerModal[\s\S]*?<\/PdfViewerModal>\s*\})?\s*<\/([^>]+)>/m;
const match = content.match(returnRegex);
if (!match) {
   console.log('regex fail');
}

