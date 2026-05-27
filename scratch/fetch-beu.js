const fetch = require('node-fetch');

async function probe() {
  const fileName = '1779620750149-lt 945.pdf';
  const encodedName = encodeURIComponent(fileName);
  
  const targets = [
    `https://beu-bih.ac.in/backend/uploads/notice/${encodedName}`,
    `https://beu-bih.ac.in/backend/uploads/${encodedName}`,
    `https://beu-bih.ac.in/backend/notice/${encodedName}`,
    `https://beu-bih.ac.in/uploads/notice/${encodedName}`,
    `https://beu-bih.ac.in/uploads/${encodedName}`,
    `https://beu-bih.ac.in/backend/v1/uploads/notice/${encodedName}`,
    `https://beu-bih.ac.in/backend/v1/notice/${encodedName}`
  ];
  
  console.log('Probing PDF attachment paths...');
  for (const url of targets) {
    try {
      const res = await fetch(url, { method: 'HEAD', headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      }});
      console.log(`URL: ${url} -> Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`\n🎉 SUCCESS! The correct base path is: ${url.replace(encodedName, '')}\n`);
      }
    } catch (e) {
      console.log(`URL: ${url} -> Error: ${e.message}`);
    }
  }
}

probe();
