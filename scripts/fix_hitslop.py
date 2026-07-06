import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} to touchable opacity with class closeBtn or similar
    # A simple regex to just add hitSlop if not present
    new_content = re.sub(
        r'<TouchableOpacity([^>]*) onPress=\{onClose\}([^>]*)>',
        lambda m: f"<TouchableOpacity{m.group(1)} onPress={{onClose}}{m.group(2)}" if 'hitSlop' in m.group(0) else f"<TouchableOpacity{m.group(1)} onPress={{onClose}} hitSlop={{{{ top: 10, bottom: 10, left: 10, right: 10 }}}}{m.group(2)}>",
        content
    )
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

for root, dirs, files in os.walk('src/components/modals'):
    for file in files:
        if file.endswith('.tsx'):
            fix_file(os.path.join(root, file))

