export function getFormattedPostTime(createdAt?: string, fallbackTimestamp?: string): string {
  if (!createdAt && !fallbackTimestamp) return 'Just now';
  
  const postDate = new Date(createdAt || fallbackTimestamp || Date.now());
  if (isNaN(postDate.getTime())) {
    return fallbackTimestamp || 'Just now';
  }

  const now = new Date();
  const diffInMs = now.getTime() - postDate.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  // 1. Less than 2 hours (handles slight future system clock drift)
  if (diffInHours < 2) {
    return 'Just now';
  }

  // 2. Same calendar day
  const isSameDay = postDate.getDate() === now.getDate() &&
                    postDate.getMonth() === now.getMonth() &&
                    postDate.getFullYear() === now.getFullYear();
  if (isSameDay) {
    return 'Today';
  }

  // 3. Previous calendar day
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = postDate.getDate() === yesterday.getDate() &&
                      postDate.getMonth() === yesterday.getMonth() &&
                      postDate.getFullYear() === yesterday.getFullYear();
  if (isYesterday) {
    return 'Yesterday';
  }

  // 4. Within last 7 calendar days
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  if (diffInDays < 7 && diffInMs >= 0) {
    return 'This week';
  }

  // 5. Older than 7 days: format as date (e.g. "May 29, 2026")
  return postDate.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}
