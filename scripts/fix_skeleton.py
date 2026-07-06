import re

with open('src/components/modals/StudyMaterialsModal.tsx', 'r') as f:
    content = f.read()

# add import
if 'import { Skeleton }' not in content:
    content = content.replace("import { Ionicons", "import { Skeleton } from '@/components/ui/Skeleton';\nimport { Ionicons")

# replace spinner block 1
skeleton_html = """                    <View style={{ gap: 12, paddingHorizontal: 10 }}>
                      <Skeleton width="100%" height={120} borderRadius={16} />
                      <Skeleton width="100%" height={120} borderRadius={16} />
                      <Skeleton width="100%" height={120} borderRadius={16} />
                    </View>"""

content = re.sub(
    r'<View style=\{styles\.centerLoading\}>\s*<ActivityIndicator size="large" color="#F97316" />\s*<Text style=\{.*\}\s*>Synchronizing Study Library...</Text>\s*</View>',
    skeleton_html,
    content
)

# replace spinner block 2
skeleton_html2 = """                <View style={{ gap: 12, paddingHorizontal: 10, marginTop: 10 }}>
                  <Skeleton width="100%" height={100} borderRadius={12} />
                  <Skeleton width="100%" height={100} borderRadius={12} />
                  <Skeleton width="100%" height={100} borderRadius={12} />
                </View>"""

content = re.sub(
    r'<View style=\{styles\.centerLoading\}>\s*<ActivityIndicator size="large" color="#F97316" />\s*<Text style=\{.*\}\s*>Fetching department library...</Text>\s*</View>',
    skeleton_html2,
    content
)

with open('src/components/modals/StudyMaterialsModal.tsx', 'w') as f:
    f.write(content)

