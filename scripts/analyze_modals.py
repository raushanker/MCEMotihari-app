import re

with open('src/app/profile.tsx', 'r') as f:
    content = f.read()

# Find comments or text near <Modal
matches = re.finditer(r'<Modal[\s\S]{0,100}?', content)
for m in matches:
    print(m.group(0))

