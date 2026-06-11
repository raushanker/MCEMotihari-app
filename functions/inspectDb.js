const admin = require('firebase-admin');

// Initialize the app with default credentials (uses the CLI credentials)
admin.initializeApp({
  projectId: 'mcemotihari-app'
});

const db = admin.firestore();

async function inspect() {
  console.log('--- PUBLIC PROFILES ---');
  const publicSnap = await db.collection('publicProfiles').limit(10).get();
  publicSnap.forEach(doc => {
    console.log(`Public doc ID: ${doc.id}, Name: ${doc.data().name}, AdminRole: ${doc.data().adminRole || 'None'}`);
  });

  console.log('\n--- PRIVATE USERS ---');
  const privateSnap = await db.collection('privateUsers').limit(10).get();
  console.log(`Found ${privateSnap.size} private documents.`);
  privateSnap.forEach(doc => {
    console.log(`Private doc ID: ${doc.id}, Email: ${doc.data().email}, Phone: ${doc.data().phone || 'None'}, Roll: ${doc.data().rollNo || 'None'}`);
  });
}

inspect().catch(err => {
  console.error('Error: ', err);
});
