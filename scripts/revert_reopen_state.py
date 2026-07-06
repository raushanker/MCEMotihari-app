import re

with open('src/store/useAppStore.ts', 'r') as f:
    content = f.read()

# Remove from interface
interface_pattern = r"\s*pendingExploreReopen:\s*boolean;\s*setPendingExploreReopen:\s*\(val:\s*boolean\)\s*=>\s*void;\s*exploreOpenedFromPath:\s*string;\s*setExploreOpenedFromPath:\s*\(path:\s*string\)\s*=>\s*void;"
content = re.sub(interface_pattern, "", content)

# Remove from state
state_pattern = r"\s*pendingExploreReopen:\s*false,\s*setPendingExploreReopen:\s*\(val\)\s*=>\s*set\(\{ pendingExploreReopen: val \}\),\s*exploreOpenedFromPath:\s*\'\/\',\s*setExploreOpenedFromPath:\s*\(path\)\s*=>\s*set\(\{ exploreOpenedFromPath: path \}\),"
content = re.sub(state_pattern, "", content)

with open('src/store/useAppStore.ts', 'w') as f:
    f.write(content)

with open('src/app/_layout.tsx', 'r') as f:
    layout_content = f.read()

# Revert tabPress listener
layout_pattern = r"useAppStore\.getState\(\)\.setExploreOpenedFromPath\(pathname\);\s*useAppStore\.getState\(\)\.setExploreMenuVisible\(true\);"
layout_content = re.sub(layout_pattern, "useAppStore.getState().setExploreMenuVisible(true);", layout_content)

# Remove useEffect for restoring modal
effect_pattern = r"useEffect\(\(\)\s*=>\s*\{\s*const\s*state\s*=\s*useAppStore\.getState\(\);\s*if\s*\(state\.pendingExploreReopen\s*&&\s*pathname\s*===\s*state\.exploreOpenedFromPath\)\s*\{\s*state\.setPendingExploreReopen\(false\);\s*state\.setExploreMenuVisible\(true\);\s*\}\s*\},\s*\[pathname\]\);"
layout_content = re.sub(effect_pattern, "", layout_content)

with open('src/app/_layout.tsx', 'w') as f:
    f.write(layout_content)

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    modal_content = f.read()

# Update destructuring
destruct_pattern = r"setExploreActiveView,\s*setPendingExploreReopen,"
modal_content = re.sub(destruct_pattern, "setExploreActiveView,", modal_content)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(modal_content)

