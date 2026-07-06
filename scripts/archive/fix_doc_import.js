const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, 'src', 'app', 'olx', '[id].tsx');
let uiContent = fs.readFileSync(uiPath, 'utf8');

uiContent = uiContent.replace("import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';\nimport { doc, getDoc } from 'firebase/firestore';", "import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';");

// Alternative fix in case it looks slightly different
if (uiContent.includes("import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';")) {
  uiContent = uiContent.replace("import { doc, getDoc } from 'firebase/firestore';", "");
  uiContent = uiContent.replace("import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';", "import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';");
}

fs.writeFileSync(uiPath, uiContent, 'utf8');
console.log('Fixed doc import');
