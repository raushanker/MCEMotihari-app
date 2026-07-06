import re

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    content = f.read()

pattern = r"  };\s*\},\s*150\);"
replacement = "  };"
content = re.sub(pattern, replacement, content)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(content)

