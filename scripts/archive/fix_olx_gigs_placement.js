const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'ExploreMenuModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /<\/View>\n*\s*\{activeView === 'olx'[\s\S]*?<\/GigsScreen>\n\s*\)\}\n/;
const match = content.match(regex);
if (match) {
    const screens = match[0].replace('</View>', '').trim();
    content = content.replace(match[0], `\n${screens}\n</View>\n`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed placement of OlxScreen and GigsScreen');
} else {
    console.log('Could not find the pattern to fix');
}
