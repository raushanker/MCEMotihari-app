import re

with open('src/store/useAppStore.ts', 'r') as f:
    content = f.read()

pattern = r"""export const sortPostsPriority = \(allPosts: Post\[\], connectionsList: ContactConnection\[\]\): Post\[\] => \{
  // Return purely chronological order for infinite pagination as requested by the user
  return \[\.\.\.allPosts\]\.sort\(\(a, b\) => \{
    const timeA = typeof \(a\.createdAt \|\| a\.timestamp\) === 'number' \? \(a\.createdAt \|\| a\.timestamp\) : new Date\(a\.createdAt \|\| a\.timestamp \|\| 0\)\.getTime\(\);
    const timeB = typeof \(b\.createdAt \|\| b\.timestamp\) === 'number' \? \(b\.createdAt \|\| b\.timestamp\) : new Date\(b\.createdAt \|\| b\.timestamp \|\| 0\)\.getTime\(\);
    return Number\(timeB\) - Number\(timeA\);
  \}\);
\};"""

replacement = """export const sortPostsPriority = (allPosts: Post[], connectionsList: ContactConnection[]): Post[] => {
  // Return purely chronological order for infinite pagination as requested by the user
  return [...allPosts].sort((a, b) => {
    let timeA = typeof (a.createdAt || a.timestamp) === 'number' ? (a.createdAt || a.timestamp) : new Date(a.createdAt || a.timestamp || 0).getTime();
    let timeB = typeof (b.createdAt || b.timestamp) === 'number' ? (b.createdAt || b.timestamp) : new Date(b.createdAt || b.timestamp || 0).getTime();
    
    // Fallback if parsing fails (e.g. timestamp is "2 days ago")
    if (Number.isNaN(Number(timeA))) timeA = 0;
    if (Number.isNaN(Number(timeB))) timeB = 0;
    
    return Number(timeB) - Number(timeA);
  });
};"""

content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

with open('src/store/useAppStore.ts', 'w') as f:
    f.write(content)

print("Fixed sortPostsPriority")
