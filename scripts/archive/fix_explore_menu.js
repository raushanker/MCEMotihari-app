const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'modals', 'ExploreMenuModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix Departments link
if (content.includes("else if (c.id === 'departments') handleExternalNav('/departments');")) {
    content = content.replace(
        "else if (c.id === 'departments') handleExternalNav('/departments');",
        "else if (c.id === 'departments') handleSubScreenOpen('departments');"
    );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed ExploreMenuModal routing');
