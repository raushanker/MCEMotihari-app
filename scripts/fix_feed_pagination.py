import re

with open('src/store/useAppStore.ts', 'r') as f:
    content = f.read()

pattern = r"// Smart feed: fetch last 7 days of posts for better diversity.*?const lastDoc = docs\[docs\.length - 1\] \|\| null;"

replacement = """if (loadMore && get().lastVisiblePostDoc) {
        // Pagination: continue from where we left off
        postsQuery = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          startAfter(get().lastVisiblePostDoc),
          limit(limitCount)
        );
      } else {
        // Normal fetch: start from the latest
        postsQuery = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      let querySnapshot = await getDocs(postsQuery);
      let docs = querySnapshot.docs;

      const lastDoc = docs[docs.length - 1] || null;"""

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/store/useAppStore.ts', 'w') as f:
    f.write(new_content)
