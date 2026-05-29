const fs = require('fs');
const parser = require('@babel/parser');

try {
  const code = fs.readFileSync('/Users/raushanisonline/Documents/GitHub/MCEMotihari app/src/app/index.tsx', 'utf8');
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  console.log('Successfully parsed index.tsx! No syntax errors.');
} catch (e) {
  console.error('JSX parsing error found:');
  console.error(e.message);
  if (e.loc) {
    console.error(`Line: ${e.loc.line}, Column: ${e.loc.column}`);
  }
}
