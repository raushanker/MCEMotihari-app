import re

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    content = f.read()

pattern = r"const handleExternalNav = \(route: any\) => \{\s*closeMenu\(\);\s*setTimeout\(\(\) => \{"
replacement = """const handleExternalNav = (route: any) => {
    // DO NOT CLOSE MENU - As per user request, it stays open in the background!
    setTimeout(() => {"""
content = re.sub(pattern, replacement, content)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(content)
