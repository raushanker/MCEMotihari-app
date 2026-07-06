const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'ExploreMenuModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update ExploreView type
const typeMatch = content.match(/type ExploreView = 'menu'.*?;/);
if (typeMatch && !typeMatch[0].includes("'olx'")) {
    const newType = typeMatch[0].replace(';', " | 'olx' | 'gigs';");
    content = content.replace(typeMatch[0], newType);
}

// 2. Add imports
const importsRegex = /import CanteenScreen from '@\/app\/canteen';[\s\S]*?import LibraryScreen from '@\/app\/library';/;
if (!content.includes("import OlxScreen from '@/app/olx/index';")) {
    content = content.replace(importsRegex, `$&
import OlxScreen from '@/app/olx/index';
import GigsScreen from '@/app/gigs/index';`);
}

// 3. Update buttons
content = content.replace(/handleExternalNav\('\/olx'\)/g, "handleSubScreenOpen('olx')");
content = content.replace(/handleExternalNav\('\/gigs'\)/g, "handleSubScreenOpen('gigs')");

// 4. Add to activeView switch
const switchBlock = `
              {activeView === 'olx' && (
                <OlxScreen 
                  onBack={handleBack} 
                  onItemClick={(id) => handleExternalNav(\`/olx/\${id}\`)}
                  onCreateClick={() => handleExternalNav('/olx/create')}
                />
              )}
              {activeView === 'gigs' && (
                <GigsScreen 
                  onBack={handleBack} 
                  onItemClick={(id) => handleExternalNav(\`/gigs/\${id}\`)}
                  onCreateClick={() => handleExternalNav('/gigs/create')}
                />
              )}
`;

const lastActiveViewRegex = /\{activeView === 'library' && \([\s\S]*?<\/View>\n/;
const match2 = content.match(lastActiveViewRegex);
if (match2 && !content.includes("<OlxScreen")) {
    content = content.replace(match2[0], `${match2[0]}${switchBlock}`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('ExploreMenuModal patched with OLX and Gigs');
