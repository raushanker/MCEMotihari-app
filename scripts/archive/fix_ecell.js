const fs = require('fs');
const path = require('path');

const ecellPath = path.join(__dirname, 'src', 'screens', 'ECellScreen.tsx');
let content = fs.readFileSync(ecellPath, 'utf8');

if (!content.includes('sectionTitle: {')) {
  content = content.replace('const styles = StyleSheet.create({', `const styles = StyleSheet.create({\n  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },`);
  fs.writeFileSync(ecellPath, content, 'utf8');
}
