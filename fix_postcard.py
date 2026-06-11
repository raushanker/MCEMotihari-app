import re

file_path = 'src/components/PostCard.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add import
if 'useUserProfile' not in content:
    content = content.replace(
        "import { useThemeColors } from '@/hooks/useThemeColors';",
        "import { useThemeColors } from '@/hooks/useThemeColors';\nimport { useUserProfile } from '@/hooks/useUserProfile';"
    )

# 2. Add hook call
if 'const authorProfile =' not in content:
    content = content.replace(
        "const theme = useThemeColors();",
        "const theme = useThemeColors();\n  const authorProfile = useUserProfile(item.isAnonymous ? undefined : item.authorUid, {\n    name: item.authorName || 'Unknown',\n    role: item.authorRole || 'Student',\n    photoUrl: item.authorPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix',\n  });"
    )

# 3. Replace item.authorName with authorProfile.name (except inside the fallback)
# We can just do specific targeted replacements
replacements = [
    ("item.authorName === user?.name", "authorProfile.name === user?.name"),
    ("name: item.authorName, role: item.authorRole, photoUrl: item.authorPhoto", "name: authorProfile.name, role: authorProfile.role as any, photoUrl: authorProfile.photoUrl"),
    ("getOptimizedImageUrl(item.authorPhoto", "getOptimizedImageUrl(authorProfile.photoUrl"),
    ("{item.authorName}", "{authorProfile.name}"),
    ("['Student', 'Alumni', 'Faculty'].includes(item.authorRole)", "['Student', 'Alumni', 'Faculty'].includes(authorProfile.role)"),
    ("${item.authorRole} •", "${authorProfile.role} •"),
    ("onConnectToggle(item.authorName, item.authorUid, item.authorRole, item.authorPhoto)", "onConnectToggle(authorProfile.name, item.authorUid, authorProfile.role as any, authorProfile.photoUrl)"),
    ("user?.name, item.authorName)", "user?.name, authorProfile.name)"),
    ("`Kya aap @${item.authorName}", "`Kya aap @${authorProfile.name}"),
    ("item.isAnonymous ? 'Anonymous Student' : item.authorName", "item.isAnonymous ? 'Anonymous Student' : authorProfile.name"),
    ("${item.authorRole || 'Member'} •", "${authorProfile.role || 'Member'} •")
]

for old, new in replacements:
    content = content.replace(old, new)

with open(file_path, 'w') as f:
    f.write(content)

print("Done")
