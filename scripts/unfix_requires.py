import os

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if line.startswith("// const ") and "require(" in line:
            new_lines.append(line[3:])
        else:
            new_lines.append(line)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

fix_file('src/store/useAppStore.ts')
fix_file('src/store/useGigsStore.ts')
fix_file('src/store/useOlxStore.ts')
