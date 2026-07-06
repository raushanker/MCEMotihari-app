const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'src', 'store', 'useAppStore.ts');
let content = fs.readFileSync(storePath, 'utf8');

const typeSearch = `'menu' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'notices' | 'calculator' | 'cgpa-calculator' | 'mceaa' | 'doc-scanner' | 'clubs'`;
const typeReplacement = `'menu' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'notices' | 'calculator' | 'cgpa-calculator' | 'mceaa' | 'doc-scanner' | 'clubs' | 'tnp' | 'tnp-noc' | 'ecell' | 'nss' | 'canteen' | 'stationary' | 'sports' | 'library'`;

if (content.includes(typeSearch)) {
  content = content.replace(new RegExp(typeSearch, 'g'), typeReplacement);
  fs.writeFileSync(storePath, content, 'utf8');
}
