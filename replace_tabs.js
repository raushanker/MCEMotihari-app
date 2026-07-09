const fs = require('fs');
let content = fs.readFileSync('src/app/_layout.tsx', 'utf8');
content = content.replace(/import \{ Tabs, useLocalSearchParams, usePathname \} from "expo-router";/, 'import { Stack, useLocalSearchParams, usePathname } from "expo-router";');
const startIndex = content.indexOf('<Tabs');
const endIndex = content.indexOf('</Tabs>') + 7;
if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `      <Stack screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="explore" options={{ presentation: 'transparentModal' }} />
      </Stack>`;
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
}
// Remove ExploreMenuModal
content = content.replace(/<ExploreMenuModal \/>\n/g, '');
content = content.replace(/import \{ ExploreMenuModal \} from "@\/components\/modals\/ExploreMenuModal";\n/g, '');
fs.writeFileSync('src/app/_layout.tsx', content);
console.log('Replaced successfully');
