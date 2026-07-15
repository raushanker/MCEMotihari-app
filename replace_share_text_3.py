import os
import re

files_to_update = [
    'src/app/post/[id].tsx',
    'src/app/ecell/startup/[id].tsx',
    'src/app/(tabs)/notice.tsx',
    'src/app/department/[id]/consultancy.tsx',
    'src/app/[username].tsx'
]

replacements = [
    (r'Read full post on MCE Connect:\\n🔗 \$\{profileUrl\}',
     r'Read full post on MCE Connect:\\n🔗 ${profileUrl}\\n\\nDownload App: MCE Motihari connect\\nhttps://play.google.com/store/apps/details?id=mcemotihari.app'),
     
    (r'Shared via MCE Motihari App:\\n\$\{APP_LINK\}',
     r'Download App: MCE Motihari connect\\nhttps://play.google.com/store/apps/details?id=mcemotihari.app'),
]

for filepath in files_to_update:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements:
        new_content = re.sub(old, new, new_content)
        
    # for files that construct shareMessage: notice.tsx, startup/[id].tsx, [username].tsx
    if 'shareMessage +=' not in new_content and 'const message =' not in new_content:
        # maybe they do something else
        pass
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

