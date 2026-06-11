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
  console.log('Querying public profiles...');
  try {
    const q = query(collection(db, 'publicProfiles'), limit(10));
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} profiles:`);
    snap.forEach(docSnap => {
      console.log(`ID: ${docSnap.id}, Data:`, JSON.stringify(docSnap.data()));
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
