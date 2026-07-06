import re

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    content = f.read()

# Replace <Modal ...> with <Animated.View ...>
pattern = r"<Modal\s*visible\s*transparent\s*animationType=\"none\"\s*onRequestClose=\{[^{}]*\{[^}]*\}[^}]*\}\s*>"
replacement = """<Animated.View 
    style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
    pointerEvents={isExploreMenuVisible ? 'auto' : 'none'}
  >"""
content = re.sub(pattern, replacement, content)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(content)

