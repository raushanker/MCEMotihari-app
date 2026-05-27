import fetch from 'node-fetch';

async function testFetch() {
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json, application/xml, text/xml, */*'
  };

  console.log('--- TESTING WP JSON API ---');
  try {
    const jsonUrl = 'https://www.mcemotihari.ac.in/wp-json/wp/v2/posts?categories=4&per_page=30';
    console.log('Fetching:', jsonUrl);
    const res = await fetch(jsonUrl, { headers: browserHeaders });
    console.log('JSON Status:', res.status);
    const text = await res.text();
    console.log('JSON Length:', text.length);
    console.log('JSON Snippet:', text.substring(0, 200));
  } catch (err) {
    console.error('JSON Error:', err);
  }

  console.log('\n--- TESTING RSS XML FEED ---');
  try {
    const rssUrl = 'https://www.mcemotihari.ac.in/category/notices/feed/';
    console.log('Fetching:', rssUrl);
    const res = await fetch(rssUrl, { headers: browserHeaders });
    console.log('RSS Status:', res.status);
    const text = await res.text();
    console.log('RSS Length:', text.length);
    console.log('RSS Snippet:', text.substring(0, 500));
  } catch (err) {
    console.error('RSS Error:', err);
  }
}

testFetch();
