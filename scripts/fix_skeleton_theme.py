import re

with open('src/components/ui/Skeleton.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { useTheme } from '../../hooks/useTheme';", "import { useThemeColors } from '../../hooks/useThemeColors';")
content = content.replace("const { theme } = useTheme();", "const theme = useThemeColors();")

with open('src/components/ui/Skeleton.tsx', 'w') as f:
    f.write(content)

with open('src/app/profile.tsx', 'r') as f:
    content2 = f.read()
content2 = content2.replace('import { Ionicons } from "@expo/vector-icons";', 'import { Ionicons, MaterialIcons } from "@expo/vector-icons";')

with open('src/app/profile.tsx', 'w') as f:
    f.write(content2)

