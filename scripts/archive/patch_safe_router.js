const fs = require('fs');
const path = require('path');

const routerPath = path.join(__dirname, 'src', 'hooks', 'useSafeRouter.ts');
let content = fs.readFileSync(routerPath, 'utf8');

// Add push to historyStack in push
const pushSearch = `    router.push(href);
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);`;
const pushReplace = `    historyStack.push(String(href));
    router.push(href);
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);`;
if (content.includes(pushSearch)) {
  content = content.replace(pushSearch, pushReplace);
}

// Add replace to historyStack in replace
const replaceSearch = `    router.replace(href);
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);`;
const replaceReplace = `    if (historyStack.length > 0) {
      historyStack[historyStack.length - 1] = String(href);
    } else {
      historyStack.push(String(href));
    }
    router.replace(href);
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);`;
if (content.includes(replaceSearch)) {
  content = content.replace(replaceSearch, replaceReplace);
}

// We should also make sure the initial route is in historyStack if it's empty, but relying on params is safer.
fs.writeFileSync(routerPath, content, 'utf8');
console.log('Patched useSafeRouter.ts historyStack');
