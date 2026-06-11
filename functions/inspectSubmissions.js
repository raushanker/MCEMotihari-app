const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'mcemotihari-app'
  });
}

const db = admin.firestore();

async function run() {
  try {
    console.log("Listing study material submissions (admin):");
    const colRef = db.collection('study_material_submissions');
    const snap = await colRef.orderBy('createdAt', 'desc').limit(20).get();
    
    if (snap.empty) {
      console.log("No submissions found.");
      return;
    }

    snap.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`- ID: ${docSnap.id}`);
      console.log(`  Title: ${data.title}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Semester: ${data.semester}`);
      console.log(`  Branch: ${data.branch}`);
      console.log(`  Category: ${data.materialType}`);
      console.log(`  OwnerUid: ${data.ownerUid}`);
      console.log(`  CreatedAt: ${data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : 'N/A'}`);
      console.log('------------------------------');
    });
  } catch (err) {
    console.error("Error listing submissions:", err);
  }
}

run();
