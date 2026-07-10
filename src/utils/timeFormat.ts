export function parseDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  const parsed = new Date(timestamp);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function getFormattedPostTime(createdAt?: any, fallbackTimestamp?: string): string {
  if (!createdAt && !fallbackTimestamp) return 'Just now';
  
  const postDate = parseDate(createdAt) || (fallbackTimestamp ? new Date(fallbackTimestamp) : new Date());

  if (isNaN(postDate.getTime())) {
    return fallbackTimestamp || 'Just now';
  }

  const now = new Date();
  const diffInMs = now.getTime() - postDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInMinutes < 1) {
    return 'Just now';
  }
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Older than 7 days: format as date (e.g. "May 29, 2026")
  return postDate.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}
