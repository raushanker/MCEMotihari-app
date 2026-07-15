import os
import re

directory = 'src'

replacements = [
    (r'Shared from MCE Connect app\.\\nDownload here: https://play\.google\.com/store/apps/details\?id=mcemotihari\.app',
     r'Download App: MCE Motihari connect\nhttps://play.google.com/store/apps/details?id=mcemotihari.app'),
     
    (r'📲 Download MCE Connect \(Official College App\):\\n🔗 https://play\.google\.com/store/apps/details\?id=mcemotihari\.app',
     r'Download App: MCE Motihari connect\nhttps://play.google.com/store/apps/details?id=mcemotihari.app'),
     
    (r'Download now on Play Store:\\n🔗 https://play\.google\.com/store/apps/details\?id=mcemotihari\.app',
     r'Download App: MCE Motihari connect\nhttps://play.google.com/store/apps/details?id=mcemotihari.app'),
     
    (r'https://play\.google\.com/store/apps/details\?id=com\.mcemotihari\.app',
     r'https://play.google.com/store/apps/details?id=mcemotihari.app'),
]

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
