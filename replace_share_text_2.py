import os
import re

directory = 'src'

replacements = [
    (r'shareMessage \+= `📲 Download MCE Connect \(Official College App\):\\n`;\s*shareMessage \+= `🔗 https://play\.google\.com/store/apps/details\?id=mcemotihari\.app`;',
     r'shareMessage += `Download App: MCE Motihari connect\\n`;\n      shareMessage += `https://play.google.com/store/apps/details?id=mcemotihari.app`;'),
     
    (r'shareMessage \+= `📲 Download MCE Connect App!\\n\\n`;',
     r'shareMessage += `Download App: MCE Motihari connect\\nhttps://play.google.com/store/apps/details?id=mcemotihari.app\\n\\n`;'),
     
    (r'shareMessage \+= `📲 Download the MCE Connect app today!`;',
     r'shareMessage += `Download App: MCE Motihari connect\\nhttps://play.google.com/store/apps/details?id=mcemotihari.app`;'),
     
    (r'shareMessage \+= `📲 Build your verified profile card today!`;',
     r'shareMessage += `Download App: MCE Motihari connect\\nhttps://play.google.com/store/apps/details?id=mcemotihari.app`;'),
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
