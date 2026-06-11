const fs = require('fs');
const file = fs.readFileSync('src/app/notanadmin/(panel)/users.tsx', 'utf8');

// I will do multi_replace_file_content instead as it is safer and standard practice.
