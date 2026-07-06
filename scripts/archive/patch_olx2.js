const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', '[id].tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Wrap the main return in a fragment
const returnSearch = `  return (
    <KeyboardAvoidingView`;
const returnReplacement = `  return (
    <>
    <KeyboardAvoidingView`;

if (content.includes(returnSearch) && !content.includes('<>\\n    <KeyboardAvoidingView')) {
  content = content.replace(returnSearch, returnReplacement);
}

const endSearch = `      </Modal>

  );
}`;
const endReplacement = `      </Modal>
    </>
  );
}`;

if (content.includes(endSearch)) {
  content = content.replace(endSearch, endReplacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully fixed fragment in olx/[id].tsx');
