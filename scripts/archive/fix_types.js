const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'ExploreMenuModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const typeMatch = content.match(/export type ExploreView = 'menu' \| 'hub' \| (.*?);/);
if (typeMatch) {
    const newType = "export type ExploreView = 'menu' | 'hub' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'notices' | 'calculator' | 'cgpa-calculator' | 'mceaa' | 'doc-scanner' | 'clubs' | 'stationary' | 'sports' | 'library' | 'canteen' | 'tnp' | 'tnp-noc' | 'ecell' | 'nss' | 'campus-map' | 'notepad' | 'events' | 'holidays' | 'study-materials' | 'about' | 'results';";
    content = content.replace(typeMatch[0], newType);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ExploreView type');
}
