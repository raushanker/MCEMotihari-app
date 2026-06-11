const fs = require('fs');
const lines = fs.readFileSync('/Users/raushanisonline/.gemini/antigravity/brain/fb9fd280-c710-4d9d-b001-29d0a90cbf03/.system_generated/logs/transcript.jsonl', 'utf8').split('\n').reverse();

for (const line of lines) {
  if (line && line.includes('USER_INPUT') && line.includes('MCE Connect')) {
    try {
      const data = JSON.parse(line);
      if (data.type === 'USER_INPUT') {
        console.log(data.content);
        break;
      }
    } catch (e) {
      // ignore
    }
  }
}
