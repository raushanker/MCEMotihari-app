const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc } = require('firebase/firestore');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
const processEnv = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim().replace(/^export\s+/, '');
      const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
      processEnv[key] = val;
    }
  });
}

const firebaseConfig = {
  apiKey: processEnv.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: processEnv.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: processEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: processEnv.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: processEnv.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: processEnv.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    console.log("Querying all pending submissions...");
    const colRef = collection(db, 'study_material_submissions');
    const q = query(colRef, where('status', '==', 'PENDING'));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.log("No pending submissions found.");
      return;
    }

    console.log(`Found ${snap.size} pending submissions to approve.`);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      console.log(`Approving: ID=${docSnap.id}, Title="${data.title}"`);
      const docRef = doc(db, 'study_material_submissions', docSnap.id);
      await updateDoc(docRef, {
        status: 'APPROVED'
      });
    }
    console.log("All pending submissions successfully updated to APPROVED!");
  } catch (err) {
    console.error("Error during approval:", err);
  }
}

run();
