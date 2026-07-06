import re

with open('src/app/_layout.tsx', 'r') as f:
    content = f.read()

# Update tabPress listener
pattern = r"useAppStore\.getState\(\)\.setExploreMenuVisible\(true\);"
replacement = """useAppStore.getState().setExploreOpenedFromPath(pathname);
              useAppStore.getState().setExploreMenuVisible(true);"""
content = re.sub(pattern, replacement, content)

# Add useEffect for restoring modal
effect_pattern = r"const \[splashAnimationDone, setSplashAnimationDone\] = useState\(false\);"
effect_replacement = """const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  useEffect(() => {
    const state = useAppStore.getState();
    if (state.pendingExploreReopen && pathname === state.exploreOpenedFromPath) {
      state.setPendingExploreReopen(false);
      state.setExploreMenuVisible(true);
    }
  }, [pathname]);"""

content = re.sub(effect_pattern, effect_replacement, content)

with open('src/app/_layout.tsx', 'w') as f:
    f.write(content)

