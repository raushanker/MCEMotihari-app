import re

with open('src/app/department/[id]/index.tsx', 'r') as f:
    content = f.read()

pattern = r"""  const handleBack = \(\) => \{
    if \(router\.canGoBack\(\)\) \{
      if \(router\.canGoBack\(\)\) \{ router\.back\(\); \} else \{ router\.replace\('/'\); \}
    \} else \{
      router\.replace\('/departments'\);
    \}
    
    if \(from === 'explore'\) \{
      setExploreMenuVisible\(true, true\);
    \}
  \};"""

replacement = """  const handleBack = () => {
    if (from === 'explore') {
      // Force navigation to home tab where explore menu is, avoiding any corrupted stack history
      setExploreMenuVisible(true, true);
      router.navigate('/');
      return;
    }
    
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/departments');
    }
  };"""

content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

with open('src/app/department/[id]/index.tsx', 'w') as f:
    f.write(content)

print("Fixed handleBack")
