const fs = require('fs');
const path = require('path');

const themePath = path.join(__dirname, 'src', 'constants', 'theme.ts');
let themeContent = fs.readFileSync(themePath, 'utf8');

if (!themeContent.includes("error: '#EF4444'")) {
  themeContent = themeContent.replace(/cardBorder: '#E2E8F0',/g, "cardBorder: '#E2E8F0',\n    danger: '#EF4444',\n    error: '#EF4444',");
}
if (!themeContent.includes("cardBorder: 'rgba(255, 255, 255, 0.08)',\n    danger: '#EF4444'")) {
  themeContent = themeContent.replace(/cardBorder: 'rgba\(255, 255, 255, 0\.08\)',/g, "cardBorder: 'rgba(255, 255, 255, 0.08)',\n    danger: '#EF4444',\n    error: '#EF4444',");
}

fs.writeFileSync(themePath, themeContent, 'utf8');

const storePath = path.join(__dirname, 'src', 'store', 'useAppStore.ts');
let storeContent = fs.readFileSync(storePath, 'utf8');

const tsTypes = `'menu' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'notices' | 'calculator' | 'cgpa-calculator' | 'mceaa' | 'doc-scanner' | 'clubs' | 'tnp' | 'tnp-noc' | 'ecell' | 'nss' | 'canteen' | 'stationary' | 'sports' | 'library'`;

storeContent = storeContent.replace(
  /exploreActiveView:\s*'menu'[^;]+;/,
  `exploreActiveView: ${tsTypes};`
);

fs.writeFileSync(storePath, storeContent, 'utf8');
console.log('Final TS fix done');
