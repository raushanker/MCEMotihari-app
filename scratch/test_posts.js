const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCnmV4wvta_ovLwQJT0nNT2ul1oFDHmjsA",
  authDomain: "mcemotihari-app.firebaseapp.com",
  projectId: "mcemotihari-app",
  storageBucket: "mcemotihari-app.firebasestorage.app",
  messagingSenderId: "1071649927142",
  appId: "1:1071649927142:web:b8d54d5c705fb290ff7027"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log('Querying posts...');
  try {
    const postsQuery = query(collection(db, 'posts'), limit(20));
    const snap = await getDocs(postsQuery);
    console.log(`Found ${snap.size} posts:`);
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.pollOptions) {
        console.log(`\n--- Poll Post [ID: ${docSnap.id}] ---`);
        console.log('Title:', data.title);
        console.log('AuthorUid:', data.authorUid);
        console.log('PollOptions:', JSON.stringify(data.pollOptions, null, 2));
        console.log('TotalVotes:', data.totalVotes);
        console.log('AllowMultipleVotes:', data.allowMultipleVotes);
      }
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
