import re

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    content = f.read()

pattern_nav = r"const handleExternalNav = \(route: any\) => \{\s*closeMenu\(\);"
replacement_nav = """const handleExternalNav = (route: any) => {
    setPendingExploreReopen(true);
    closeMenu();"""
content = re.sub(pattern_nav, replacement_nav, content)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(content)
