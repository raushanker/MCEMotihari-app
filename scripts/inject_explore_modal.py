import re
import os

# 1. Remove from _layout.tsx
with open('src/app/_layout.tsx', 'r') as f:
    layout_content = f.read()

layout_content = layout_content.replace("<ExploreMenuModal />", "")
# keep the import in layout because we might need it? No, actually removing it is cleaner, but let's just remove the jsx.

with open('src/app/_layout.tsx', 'w') as f:
    f.write(layout_content)

# 2. Inject into the 4 tab screens
tab_screens = ['src/app/index.tsx', 'src/app/network.tsx', 'src/app/notice.tsx', 'src/app/community.tsx']

for screen in tab_screens:
    if os.path.exists(screen):
        with open(screen, 'r') as f:
            content = f.read()
        
        # Add import if missing
        if "ExploreMenuModal" not in content:
            # find last import
            last_import_idx = content.rfind("import ")
            next_newline = content.find("\n", last_import_idx)
            content = content[:next_newline+1] + "import { ExploreMenuModal } from '@/components/modals/ExploreMenuModal';\n" + content[next_newline+1:]
        
        # Add component at the end of the root View/SafeAreaView
        # We look for the last closing tag before the final export or just the last closing tag of the main return
        # Since it's a bit complex with regex, we can just find the last </SafeAreaView> or </View> that closes the component.
        
        # A simpler way: just replace the first `</SafeAreaView>` or `</View>` matching the root component.
        # Actually, let's just use regex to insert it before the very last closing tag in the file that looks like a root wrapper.
        # For index.tsx, it's `</SafeAreaView>` at the end.
        if "</SafeAreaView>" in content:
            # Replace the last occurrence
            parts = content.rsplit("</SafeAreaView>", 1)
            content = parts[0] + "  <ExploreMenuModal />\n    </SafeAreaView>" + parts[1]
        elif "</View>" in content:
            # Replace the last occurrence
            parts = content.rsplit("</View>", 1)
            content = parts[0] + "  <ExploreMenuModal />\n    </View>" + parts[1]
            
        with open(screen, 'w') as f:
            f.write(content)

