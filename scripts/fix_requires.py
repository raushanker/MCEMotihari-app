import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    changed = False
    for line in lines:
        if "require(" in line and "const " in line and "{" in line:
            # We can just comment it out
            new_lines.append("// " + line.lstrip())
            changed = True
        elif "const AsyncStorage = require('@react-native-async-storage/async-storage').default;" in line:
            new_lines.append("// " + line.lstrip())
            changed = True
        else:
            new_lines.append(line)
            
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

fix_file('src/store/useAppStore.ts')
fix_file('src/store/useGigsStore.ts')
fix_file('src/store/useOlxStore.ts')
