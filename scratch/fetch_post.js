const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').limit(5).get();
  postsSnapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().authorName, doc.data().authorUid, doc.data().title);
  });
}
run();
