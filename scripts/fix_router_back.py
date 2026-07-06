import os
import re

def main():
    src_dir = 'src'
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'router.back()' in content:
                    content = content.replace('onPress={() => router.back()}', "onPress={() => router.canGoBack() ? router.back() : router.replace('/')}")
                    content = content.replace('onPress={() => { router.back(); }}', "onPress={() => { router.canGoBack() ? router.back() : router.replace('/'); }}")
                    
                    lines = content.split('\n')
                    new_lines = []
                    for line in lines:
                        stripped = line.strip()
                        if stripped == 'router.back();':
                            # check if not already in an if condition like `if (router.canGoBack()) router.back();`
                            # which would strip to `if (router.canGoBack()) router.back();`
                            new_lines.append(line.replace('router.back();', "if (router.canGoBack()) { router.back(); } else { router.replace('/'); }"))
                        elif stripped == 'router.back()':
                            new_lines.append(line.replace('router.back()', "if (router.canGoBack()) { router.back(); } else { router.replace('/'); }"))
                        else:
                            new_lines.append(line)
                    
                    content = '\n'.join(new_lines)
                    
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)

if __name__ == '__main__':
    main()
