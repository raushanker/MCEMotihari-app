import os
import re

def fix_duplicate_imports(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # If we see `import { Ionicons, MaterialIcons } from "@expo/vector-icons"` and `import { Ionicons } from '@expo/vector-icons'`
    # We should clean up imports from "@expo/vector-icons"
    lines = content.split('\n')
    new_lines = []
    has_expo_vector_icons = False
    
    for line in lines:
        if 'from "@expo/vector-icons"' in line or "from '@expo/vector-icons'" in line:
            if not has_expo_vector_icons:
                new_lines.append('import { Ionicons, MaterialIcons } from "@expo/vector-icons";')
                has_expo_vector_icons = True
        else:
            new_lines.append(line)
            
    new_content = '\n'.join(new_lines)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            fix_duplicate_imports(os.path.join(root, file))
