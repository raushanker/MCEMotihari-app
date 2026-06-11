const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, limit, query } = require('firebase/firestore');

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
  console.log('Fetching private document for Zdxi8kTc2kcs1cOPxWS81PTVmco2...');
  try {
    const snap = await getDoc(doc(db, 'privateUsers', 'Zdxi8kTc2kcs1cOPxWS81PTVmco2'));
    if (snap.exists()) {
      console.log('Exists! Data:', snap.data());
    } else {
      console.log('Does not exist.');
    }
  } catch (err) {
    console.error('Error fetching Zdxi8kTc2kcs1cOPxWS81PTVmco2:', err.message);
  }

  console.log('Fetching private document for 8NsaYmPrUsMITTvixAPf3KlYgzo1...');
  try {
    const snap = await getDoc(doc(db, 'privateUsers', '8NsaYmPrUsMITTvixAPf3KlYgzo1'));
    if (snap.exists()) {
      console.log('Exists! Data:', snap.data());
    } else {
      console.log('Does not exist.');
    }
  } catch (err) {
    console.error('Error fetching 8NsaYmPrUsMITTvixAPf3KlYgzo1:', err.message);
  }
}

test();
