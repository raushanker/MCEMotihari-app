import re

with open('src/store/useAppStore.ts', 'r') as f:
    content = f.read()

# Remove the memory safety cap
pattern = r"// Memory Safety: Keep max 150 posts in memory after sorting by priority\s*if \(sortedFetchedPosts\.length > 150\) \{\s*sortedFetchedPosts = sortedFetchedPosts\.slice\(0, 150\);\s*\}"
content = re.sub(pattern, "", content)

with open('src/store/useAppStore.ts', 'w') as f:
    f.write(content)
