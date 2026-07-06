import re

with open('src/components/modals/ExploreMenuModal.tsx', 'r') as f:
    content = f.read()

# Add useIsFocused import
import_pattern = r"import React, { useEffect, useRef, useState } from 'react';"
import_replacement = """import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';"""
content = re.sub(import_pattern, import_replacement, content)

# Add useIsFocused hook inside component
hook_pattern = r"const insets = useSafeAreaInsets\(\);\s*const isDark = theme\.isDark;"
hook_replacement = """const insets = useSafeAreaInsets();
  const isDark = theme.isDark;
  const isFocused = useIsFocused();"""
content = re.sub(hook_pattern, hook_replacement, content)

# Modify back handler to check isFocused
back_pattern = r"if \(!isExploreMenuVisible\) return;"
back_replacement = """if (!isExploreMenuVisible || !isFocused) return;"""
content = re.sub(back_pattern, back_replacement, content)

# Remove Modal import
modal_import_pattern = r"Modal,\s*"
content = re.sub(modal_import_pattern, "", content)

# Replace <Modal> with <Animated.View>
# Find the start of the Modal return
return_pattern = r"return \(\s*<Modal\s*transparent\s*visible=\{isExploreMenuVisible\}\s*animationType=\"none\"\s*onRequestClose=\{handleBack\}\s*>"
return_replacement = """return (
    <Animated.View 
      style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
      pointerEvents={isExploreMenuVisible ? 'auto' : 'none'}
    >"""
content = re.sub(return_pattern, return_replacement, content)

# Replace closing </Modal>
close_pattern = r"<\/Modal>"
close_replacement = """</Animated.View>"""
content = re.sub(close_pattern, close_replacement, content)

with open('src/components/modals/ExploreMenuModal.tsx', 'w') as f:
    f.write(content)

