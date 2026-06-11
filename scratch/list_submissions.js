const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');

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
    console.log("Listing last 10 submissions:");
    const colRef = collection(db, 'study_material_submissions');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(10));
    const snap = await getDocs(q);
    
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
      console.log(`  CreatedAt: ${data.createdAt}`);
      console.log('------------------------------');
    });
  } catch (err) {
    console.error("Error listing submissions:", err);
  }
}

run();
