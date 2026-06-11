const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'mcemotihari-app'
  });
}

const db = admin.firestore();

async function run() {
  try {
    console.log("Creating mock pending study material submission...");
    const docRef = await db.collection('study_material_submissions').add({
      title: 'Mock pending material',
      fileName: 'mock_pending.pdf',
      fileHash: 'mock_hash_123456',
      uploaderName: 'Test Uploader',
      uploaderEmail: 'test@mcemotihari.ac.in',
      ownerUid: 'test_uid_99999',
      semester: '1st Semester',
      branch: 'CSE',
      materialType: 'Teacher Notes',
      description: 'This is a mock pending study material for testing admin approval.',
      status: 'PENDING',
      driveFileId: '1aQ5LSOFGNCc-guR-7d_NVuqP-CH9_9uQ',
      webViewUrl: 'https://drive.google.com/file/d/1aQ5LSOFGNCc-guR-7d_NVuqP-CH9_9uQ/view?usp=drivesdk',
      directUrl: 'https://drive.google.com/uc?export=download&id=1aQ5LSOFGNCc-guR-7d_NVuqP-CH9_9uQ',
      createdAt: new Date().toISOString()
    });
    
    console.log(`Successfully created mock pending submission with ID: ${docRef.id}`);
  } catch (err) {
    console.error("Error creating mock pending submission:", err);
  }
}

run();
