const fs = require('fs');
const path = require('path');

function patchScreen(filePath, componentName, routeName) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Props Interface
  const propsInterface = `
export interface ${componentName}Props {
  onBack?: () => void;
  onItemClick?: (id: string) => void;
  onCreateClick?: () => void;
}
`;

  if (!content.includes(`${componentName}Props`)) {
    content = content.replace(/export default function \w+\(\) \{/, `${propsInterface}\nexport default function ${componentName}({ onBack, onItemClick, onCreateClick }: ${componentName}Props = {}) {`);
  }

  // Patch handleBack
  const handleBackRegex = /const handleBack = \(\) => \{\s*if \(router\.canGoBack\(\)\) \{\s*router\.back\(\);\s*\} else \{\s*router\.push\('\/'\);\s*\}\s*\};/m;
  if (content.match(handleBackRegex)) {
      content = content.replace(handleBackRegex, `const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };`);
  }

  // Patch router.push for items
  // In OLX: onPress={() => router.push(`/olx/${item.id}` as any)}
  // In Gigs: onPress={() => router.push(`/gigs/${item.id}` as any)}
  const pushItemRegex = new RegExp(`onPress=\\{\\(\\) => router\\.push\\(\\\`\\/${routeName}\\/\\$\\{item\\.id\\}\\\` as any\\)\\}`);
  if (content.match(pushItemRegex)) {
      content = content.replace(pushItemRegex, `onPress={() => onItemClick ? onItemClick(item.id) : router.push(\`/${routeName}/\${item.id}\` as any)}`);
  }

  // Patch router.push for create
  // In OLX: router.push('/olx/create')
  // In Gigs: router.push('/gigs/create')
  const pushCreateRegex = new RegExp(`router\\.push\\('\\/${routeName}\\/create'\\)`);
  if (content.match(pushCreateRegex)) {
      content = content.replace(pushCreateRegex, `onCreateClick ? onCreateClick() : router.push('/${routeName}/create')`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

patchScreen(path.join(__dirname, 'src', 'app', 'olx', 'index.tsx'), 'OlxScreen', 'olx');
patchScreen(path.join(__dirname, 'src', 'app', 'gigs', 'index.tsx'), 'GigsScreen', 'gigs');

console.log('Patched OLX and Gigs screens');
