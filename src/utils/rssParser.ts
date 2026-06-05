export interface NoticeItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  rawDate: string; // Keep timestamp for sorting
  snippet: string;
  category: 'Exams' | 'Placements' | 'Holidays' | 'Academic' | 'Workshops' | 'Circulars' | 'Admissions' | 'Scholarships';
  isImportant: boolean;
  isPinned: boolean;
  isNew: boolean;
  pdfUrl?: string;
  attachmentUrl?: string;
}

export function resolveAbsoluteUrl(url: string | undefined, defaultDomain: string = 'https://www.mcemotihari.ac.in'): string | undefined {
  if (!url) return undefined;
  let clean = url.trim();
  if (clean.startsWith('//')) return `https:${clean}`;
  if (clean.startsWith('/')) {
    return `${defaultDomain}${clean}`;
  }
  if (!/^https?:\/\//i.test(clean)) {
    return `${defaultDomain}/${clean}`;
  }
  return clean;
}

// Map website categories/titles to MCE UI notices category structure
export function mapCategory(title: string, rawCategories: string[]): NoticeItem['category'] {
  const normalizedTitle = String(title || '').toLowerCase();
  const cats = Array.isArray(rawCategories) ? rawCategories.map(c => String(c || '').toLowerCase()) : [];

  // Helper matching function
  const matches = (keywords: string[]) => 
    keywords.some(kw => normalizedTitle.includes(kw) || cats.some(c => c.includes(kw)));

  if (matches(['exam', 'mid-term', 'timetable', 'schedule', 'viva', 'test', 'result', 'admit card'])) {
    return 'Exams';
  }
  if (matches(['placement', 'wipro', 'hiring', 'recruit', 'tpo', 'career', 'interview', 'job', 'tcs', 'cognizant'])) {
    return 'Placements';
  }
  if (matches(['holiday', 'recess', 'closed', 'puja', 'diwali', 'break', 'vacation', 'chath'])) {
    return 'Holidays';
  }
  if (matches(['workshop', 'seminar', 'webinar', 'conference', 'symposium', 'bootcamp', 'training'])) {
    return 'Workshops';
  }
  if (matches(['admission', 'intake', 'enroll', 'counseling', 'registration'])) {
    return 'Admissions';
  }
  if (matches(['scholarship', 'nsp', 'pms', 'financial', 'stipend', 'fee waiver'])) {
    return 'Scholarships';
  }
  if (matches(['circular', 'order', 'regulation', 'notice', 'official', 'office order'])) {
    return 'Circulars';
  }
  
  return 'Academic'; // Default fallback
}

// Clean HTML tags and CDATA elements with strict crash-prevention
export function cleanHtml(text: any): string {
  if (!text) return '';
  const str = String(text);
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA wrapper
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#038;/g, '&')
    .replace(/\s+/g, ' ') // Collapse extra spaces
    .trim();
}

// Format date into standard readable May 24, 2026 string securely
export function formatDate(dateStr: any): { pubDate: string; rawDate: string } {
  try {
    if (!dateStr) {
      throw new Error('Empty date string');
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid Date');
    }
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return { pubDate: formatted, rawDate: date.toISOString() };
  } catch (e) {
    // Fallback regex matching for "DD Month YYYY" format
    if (typeof dateStr === 'string') {
      const match = dateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);
      if (match) {
        return { pubDate: `${match[2]} ${match[1]}, ${match[3]}`, rawDate: new Date().toISOString() };
      }
    }
    // Return formatted today as a bulletproof safe fallback
    const today = new Date();
    const formattedToday = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return { pubDate: formattedToday, rawDate: today.toISOString() };
  }
}

// Parse XML RSS feed payload directly using platform-agnostic Regex
export function parseNoticesRSS(xmlText: string): NoticeItem[] {
  const notices: NoticeItem[] = [];
  
  if (!xmlText) return notices;

  // Extract all <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    // Extract title
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = titleMatch ? cleanHtml(titleMatch[1]) : 'MCE Official Circular';
    
    // Extract link
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const link = linkMatch ? linkMatch[1].trim() : 'https://www.mcemotihari.ac.in';
    
    // Extract pubDate
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const rawPubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
    const { pubDate, rawDate } = formatDate(rawPubDate);
    
    // Extract category tags
    const categoryRegex = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi;
    const rawCategories: string[] = [];
    let catMatch;
    while ((catMatch = categoryRegex.exec(itemXml)) !== null) {
      rawCategories.push(cleanHtml(catMatch[1]));
    }
    
    // Extract description/content preview
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const contentMatch = itemXml.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
    
    const rawContent = contentMatch ? contentMatch[1] : (descMatch ? descMatch[1] : '');
    let snippet = cleanHtml(rawContent).trim();
    if (!snippet) {
      snippet = 'Tap on "Official Link" to view the complete announcement details on the official MCE website.';
    } else {
      snippet = snippet.slice(0, 150) + (snippet.length > 150 ? '...' : '');
    }
    
    // Extract PDF and attachment URLs from content/description
    const pdfRegex = /href=["']([^"']+\.pdf)["']/i;
    const attachmentRegex = /href=["']([^"']+(?:uploads|wp-content)[^"']+)["']/i;
    
    let pdfMatch = rawContent.match(pdfRegex);
    let attachmentMatch = rawContent.match(attachmentRegex);
    
    const pdfUrl = pdfMatch ? resolveAbsoluteUrl(pdfMatch[1]) : undefined;
    const attachmentUrl = attachmentMatch ? resolveAbsoluteUrl(attachmentMatch[1]) : undefined;
    
    // Process flags
    const category = mapCategory(title, rawCategories);
    const isImportant = title.toLowerCase().includes('important') || 
                        title.toLowerCase().includes('urgent') || 
                        title.toLowerCase().includes('mandatory') ||
                        title.toLowerCase().includes('timetable') ||
                        title.toLowerCase().includes('exam form') ||
                        title.toLowerCase().includes('postponed');
                        
    const isPinned = false;
                     
    // Calculate if published within last 7 days
    let isNew = false;
    try {
      const pubTime = new Date(rawDate).getTime();
      const diffDays = (Date.now() - pubTime) / (1000 * 60 * 60 * 24);
      isNew = diffDays >= 0 && diffDays <= 7;
    } catch (e) {}

    // Unique notice ID from either guid or notice link
    const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const id = guidMatch ? cleanHtml(guidMatch[1]) : `mce-${Date.now()}-${Math.random()}`;

    notices.push({
      id,
      title,
      link,
      pubDate,
      rawDate,
      snippet,
      category,
      isImportant,
      isPinned,
      isNew,
      pdfUrl,
      attachmentUrl
    });
  }

  // Sort notices by rawDate descending (latest first)
  return notices.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
}

// Parse WordPress REST API JSON posts directly
export function parseNoticesJSON(posts: any[]): NoticeItem[] {
  const notices: NoticeItem[] = [];

  if (!Array.isArray(posts)) return notices;

  for (const post of posts) {
    if (!post) continue;
    
    const id = String(post.id || (post.guid && post.guid.rendered) || `wp-${Date.now()}-${Math.random()}`);
    const title = cleanHtml(post.title?.rendered || 'MCE Official Circular');
    const postLink = post.link || 'https://www.mcemotihari.ac.in';
    
    // Parse Date
    const rawDate = post.date_gmt || post.date || new Date().toISOString();
    const { pubDate } = formatDate(rawDate);

    // Extract PDF URL from content.rendered if present
    const contentHtml = post.content?.rendered || '';
    const pdfRegex = /href=["']([^"']+\.pdf)["']/i;
    let pdfMatch = contentHtml.match(pdfRegex);
    let pdfUrl = pdfMatch ? resolveAbsoluteUrl(pdfMatch[1]) : undefined;

    // Fallback: if no .pdf is found, grab the first URL linked in the content if it looks like an attachment
    let attachmentUrl: string | undefined = undefined;
    if (!pdfUrl) {
      const anyLinkRegex = /href=["']([^"']+(?:uploads|wp-content)[^"']+)["']/i;
      const anyMatch = contentHtml.match(anyLinkRegex);
      if (anyMatch) {
        attachmentUrl = resolveAbsoluteUrl(anyMatch[1]);
      }
    }

    // Keep original link for web view fallback
    const link = postLink;

    // Snippet from excerpt or clean content
    const rawContent = post.excerpt?.rendered || post.content?.rendered || '';
    let snippet = cleanHtml(rawContent).trim();
    if (!snippet) {
      snippet = 'Tap on "Official Link" to view the complete announcement details on the official MCE website.';
    } else {
      snippet = snippet.slice(0, 150) + (snippet.length > 150 ? '...' : '');
    }

    // Map categories using the title
    const category = mapCategory(title, []);

    const isImportant = title.toLowerCase().includes('important') || 
                        title.toLowerCase().includes('urgent') || 
                        title.toLowerCase().includes('mandatory') ||
                        title.toLowerCase().includes('timetable') ||
                        title.toLowerCase().includes('exam form') ||
                        title.toLowerCase().includes('postponed');
                        
    const isPinned = false;

    // Calculate if published within last 7 days
    let isNew = false;
    try {
      const pubTime = new Date(rawDate).getTime();
      const diffDays = (Date.now() - pubTime) / (1000 * 60 * 60 * 24);
      isNew = diffDays >= 0 && diffDays <= 7;
    } catch (e) {}

    notices.push({
      id,
      title,
      link,
      pubDate,
      rawDate: new Date(rawDate).toISOString(),
      snippet,
      category,
      isImportant,
      isPinned,
      isNew,
      pdfUrl,
      attachmentUrl
    });
  }

  // Sort notices by rawDate descending (latest first)
  return notices.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
}

// Parse Bihar Engineering University (BEU) JSON notices natively
export function parseBEUNotices(items: any[]): NoticeItem[] {
  const notices: NoticeItem[] = [];

  if (!Array.isArray(items)) return notices;

  for (const item of items) {
    if (!item) continue;

    const id = String(item.id || `beu-${Date.now()}-${Math.random()}`);
    const title = cleanHtml(item.board || 'BEU Official Notification');
    
    // Construct the absolute attachment link securely (matching BEU Angular routing)
    const linkPath = item.link ? String(item.link).trim() : '';
    const link = 'https://beu-bih.ac.in/notification';
    const pdfUrl = linkPath ? resolveAbsoluteUrl(linkPath, 'https://beu-bih.ac.in/backend') : undefined;

    // Parse Date
    const rawDate = item.noticedate || item.createdAt || new Date().toISOString();
    const { pubDate } = formatDate(rawDate);

    // Extract excerpt/snippet from title or default message
    const snippet = 'Bihar Engineering University Official announcement. Tap on the card or action button to view the official PDF document.';

    // Map categories using the title keywords
    const category = mapCategory(title, []);

    const isImportant = item.isimportant === 1 || 
                        title.toLowerCase().includes('important') || 
                        title.toLowerCase().includes('urgent') || 
                        title.toLowerCase().includes('mandatory') ||
                        title.toLowerCase().includes('examination form') ||
                        title.toLowerCase().includes('postponed') ||
                        title.toLowerCase().includes('schedule');
                        
    const isPinned = false;

    // Calculate if published within last 7 days
    let isNew = false;
    try {
      const pubTime = new Date(rawDate).getTime();
      const diffDays = (Date.now() - pubTime) / (1000 * 60 * 60 * 24);
      isNew = diffDays >= 0 && diffDays <= 7;
    } catch (e) {}

    notices.push({
      id,
      title,
      link,
      pubDate,
      rawDate: new Date(rawDate).toISOString(),
      snippet,
      category,
      isImportant,
      isPinned,
      isNew,
      pdfUrl,
      attachmentUrl: undefined
    });
  }

  // Sort notices by rawDate descending (latest first)
  return notices.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
}

