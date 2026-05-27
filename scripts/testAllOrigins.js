import fetch from 'node-fetch';

async function testAllOrigins() {
  const jsonApiUrl = 'https://www.mcemotihari.ac.in/wp-json/wp/v2/posts?categories=4&per_page=30';
  const fetchJsonUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(jsonApiUrl + '&t=' + Date.now())}`;

  console.log('Fetching via AllOrigins:', fetchJsonUrl);
  try {
    const res = await fetch(fetchJsonUrl);
    console.log('AllOrigins JSON Status:', res.status);
    const text = await res.text();
    console.log('AllOrigins JSON Length:', text.length);
    console.log('AllOrigins JSON Snippet:', text.substring(0, 200));
  } catch (err) {
    console.error('AllOrigins JSON Error:', err);
  }

  const rssFeedUrl = 'https://www.mcemotihari.ac.in/category/notices/feed/';
  const fetchRssUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssFeedUrl + '?t=' + Date.now())}`;
  console.log('\nFetching via AllOrigins RSS:', fetchRssUrl);
  try {
    const res = await fetch(fetchRssUrl);
    console.log('AllOrigins RSS Status:', res.status);
    const text = await res.text();
    console.log('AllOrigins RSS Length:', text.length);
    console.log('AllOrigins RSS Snippet:', text.substring(0, 200));
  } catch (err) {
    console.error('AllOrigins RSS Error:', err);
  }
}

testAllOrigins();
