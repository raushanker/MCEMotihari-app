import re

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    content = f.read()

# Update destructuring
pattern_destruct = r"exploreActiveView,\s*setExploreActiveView,"
replacement_destruct = """exploreActiveView,
    setExploreActiveView,
    setPendingExploreReopen,"""
content = re.sub(pattern_destruct, replacement_destruct, content)

# Update handleExternalNav
pattern_nav = r"const handleExternalNav = \(route: any\) => \{\s*setExploreMenuVisible\(false\);"
replacement_nav = """const handleExternalNav = (route: any) => {
    setPendingExploreReopen(true);
    setExploreMenuVisible(false);"""
content = re.sub(pattern_nav, replacement_nav, content)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(content)

