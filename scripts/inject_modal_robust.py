import re
import os

tab_screens = ['src/app/index.tsx', 'src/app/network.tsx', 'src/app/notice.tsx', 'src/app/community.tsx']

for screen in tab_screens:
    if os.path.exists(screen):
        with open(screen, 'r') as f:
            content = f.read()
        
        # Remove any previously injected ExploreMenuModal that we might have messed up
        content = content.replace("<ExploreMenuModal />", "")
        
        # We want to insert it right before the last closing tag of the main component return.
        # This is usually right above `const styles = StyleSheet.create`
        
        parts = content.split("const styles = StyleSheet.create")
        if len(parts) == 2:
            # find the last closing tag in parts[0]
            # it might be </View>, </SafeAreaView>, or </Container>
            match = re.search(r'(<\/[A-Za-z]+>)\s*$', parts[0])
            if match:
                tag = match.group(1)
                parts[0] = parts[0][:match.start()] + "  <ExploreMenuModal />\n    " + tag + "\n\n"
                
                content = parts[0] + "const styles = StyleSheet.create" + parts[1]
                
                with open(screen, 'w') as f:
                    f.write(content)
                    print(f"Successfully injected into {screen}")

