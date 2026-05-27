const targetUrl = 'https://www.mcemotihari.ac.in/category/notices/feed/';

function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA wrapper
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/\s+/g, ' ') // Collapse extra spaces
    .trim();
}

function formatDate(dateStr) {
  try {
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
    const match = dateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);
    if (match) {
      return { pubDate: `${match[2]} ${match[1]}, ${match[3]}`, rawDate: new Date().toISOString() };
    }
    return { pubDate: 'Academic Notice', rawDate: new Date().toISOString() };
  }
}

function mapCategory(title, rawCategories) {
  const normalizedTitle = title.toLowerCase();
  const cats = rawCategories.map(c => c.toLowerCase());
  const matches = (keywords) => 
    keywords.some(kw => normalizedTitle.includes(kw) || cats.some(c => c.includes(kw)));

  if (matches(['exam', 'mid-term', 'timetable', 'schedule', 'viva', 'test', 'result'])) {
    return 'Exams';
  }
  if (matches(['placement', 'wipro', 'hiring', 'recruit', 'tpo', 'career', 'interview', 'job'])) {
    return 'Placements';
  }
  if (matches(['holiday', 'recess', 'closed', 'puja', 'diwali', 'break', 'vacation'])) {
    return 'Holidays';
  }
  if (matches(['workshop', 'seminar', 'webinar', 'conference', 'symposium', 'bootcamp'])) {
    return 'Workshops';
  }
  if (matches(['admission', 'intake', 'enroll', 'counseling'])) {
    return 'Admissions';
  }
  if (matches(['scholarship', 'nsp', 'pms', 'financial', 'stipend'])) {
    return 'Scholarships';
  }
  if (matches(['circular', 'order', 'notice', 'official'])) {
    return 'Circulars';
  }
  return 'Academic';
}

function parseNoticesRSS(xmlText) {
  const notices = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = titleMatch ? cleanHtml(titleMatch[1]) : 'MCE Notice';
    
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const link = linkMatch ? linkMatch[1].trim() : 'https://www.mcemotihari.ac.in';
    
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const rawPubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
    const { pubDate, rawDate } = formatDate(rawPubDate);
    
    const categoryRegex = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi;
    const rawCategories = [];
    let catMatch;
    while ((catMatch = categoryRegex.exec(itemXml)) !== null) {
      rawCategories.push(cleanHtml(catMatch[1]));
    }
    
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const contentMatch = itemXml.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
    
    const rawContent = contentMatch ? contentMatch[1] : (descMatch ? descMatch[1] : '');
    const snippet = cleanHtml(rawContent).slice(0, 140) + (cleanHtml(rawContent).length > 140 ? '...' : '');
    
    const category = mapCategory(title, rawCategories);
    const isImportant = title.toLowerCase().includes('important') || 
                        title.toLowerCase().includes('urgent') || 
                        title.toLowerCase().includes('mandatory') ||
                        title.toLowerCase().includes('timetable') ||
                        title.toLowerCase().includes('exam form');
                        
    const isPinned = false;
    let isNew = false;
    try {
      const pubTime = new Date(rawDate).getTime();
      const diffDays = (Date.now() - pubTime) / (1000 * 60 * 60 * 24);
      isNew = diffDays >= 0 && diffDays <= 7;
    } catch (e) {}

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
      isNew
    });
  }
  return notices.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
}

fetch(targetUrl)
  .then(res => res.text())
  .then(xml => {
    const parsed = parseNoticesRSS(xml);
    console.log('Successfully parsed notices count:', parsed.length);
    console.log('Top notice details:');
    console.log(JSON.stringify(parsed[0], null, 2));
  })
  .catch(err => console.error(err));
