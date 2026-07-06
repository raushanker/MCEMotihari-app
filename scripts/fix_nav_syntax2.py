import re

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    content = f.read()

pattern = r"  \};\n  \};"
replacement = "  };"
content = re.sub(pattern, replacement, content)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(content)

