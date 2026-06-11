const admin = require('firebase-admin');
// Initialize with your service account key (Download from Firebase Console -> Project Settings -> Service Accounts)
// const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  // credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateCollection(collectionName) {
  console.log(`Starting migration for ${collectionName}...`);
  const snapshot = await db.collection(collectionName).get();
  
  let updatedCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const cleanData = { ...data };
    
    // Check and clean undefined, empty strings, invalid arrays
    for (const key in cleanData) {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
        needsUpdate = true;
      } else if (cleanData[key] === '') {
        // Option to delete empty strings or keep them.
        // We'll just trim them for now or delete if it's meant to be optional.
        cleanData[key] = null;
        needsUpdate = true;
      } else if (Array.isArray(cleanData[key])) {
        const originalLength = cleanData[key].length;
        cleanData[key] = cleanData[key].filter(item => item !== undefined && item !== null && item !== '');
        if (cleanData[key].length !== originalLength) {
          needsUpdate = true;
        }
      } else if (typeof cleanData[key] === 'object' && cleanData[key] !== null) {
        // Deep check for arrays or undefined can be done here, but shallow is usually enough for top level profiles
      }
    }
    
    if (needsUpdate) {
      await db.collection(collectionName).doc(doc.id).set(cleanData, { merge: false });
      console.log(`Updated doc: ${doc.id}`);
      updatedCount++;
    }
  }
  
  console.log(`Finished ${collectionName}. Total updated: ${updatedCount}`);
}

async function run() {
  await migrateCollection('publicProfiles');
  await migrateCollection('privateUsers');
  console.log('Migration complete!');
}

// To run:
// 1. npm install firebase-admin
// 2. Download serviceAccountKey.json and uncomment initialization.
// 3. node scripts/migrateProfiles.js
// run();
