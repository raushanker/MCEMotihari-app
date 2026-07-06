import re

with open('src/store/useAppStore.ts', 'r') as f:
    content = f.read()

# Add to interface
interface_pattern = r"isExploreMenuVisible: boolean;\s*setExploreMenuVisible: \(val: boolean\) => void;"
interface_replacement = """isExploreMenuVisible: boolean;
  setExploreMenuVisible: (val: boolean) => void;
  pendingExploreReopen: boolean;
  setPendingExploreReopen: (val: boolean) => void;
  exploreOpenedFromPath: string;
  setExploreOpenedFromPath: (path: string) => void;"""
content = re.sub(interface_pattern, interface_replacement, content)

# Add to initial state
state_pattern = r"isExploreMenuVisible: false,\s*setExploreMenuVisible: \(val\) => set\(\{ isExploreMenuVisible: val \}\),"
state_replacement = """isExploreMenuVisible: false,
  setExploreMenuVisible: (val) => set({ isExploreMenuVisible: val }),
  pendingExploreReopen: false,
  setPendingExploreReopen: (val) => set({ pendingExploreReopen: val }),
  exploreOpenedFromPath: '/',
  setExploreOpenedFromPath: (path) => set({ exploreOpenedFromPath: path }),"""
content = re.sub(state_pattern, state_replacement, content)

with open('src/store/useAppStore.ts', 'w') as f:
    f.write(content)

