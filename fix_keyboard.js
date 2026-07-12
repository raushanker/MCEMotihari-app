const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = [];
walkDir('src', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    content = content.replace(/behavior=\{Platform\.OS === ['"]ios['"] \? ['"]padding['"] : ['"]height['"]\}/g, "behavior={Platform.OS === 'ios' ? 'padding' : undefined}");
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles.push(filePath);
    }
  }
});
console.log("Fixed files:", modifiedFiles);
