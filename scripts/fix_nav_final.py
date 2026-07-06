import re

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    content = f.read()

# Replace handleExternalNav entirely
pattern = r"const handleExternalNav = \(route: any\) => \{.*?router\.push[^}]*\}[^}]*\}[^;]*;"
replacement = """const handleExternalNav = (route: any) => {
    // DO NOT CLOSE MENU - As per user request, it stays open in the background!
    setTimeout(() => {
      const routeStr = String(route);
      const separator = routeStr.includes('?') ? '&' : '?';
      router.push(`${routeStr}${separator}from=explore&exploreView=${activeView}` as any);
    }, 150);
  };"""
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(content)

