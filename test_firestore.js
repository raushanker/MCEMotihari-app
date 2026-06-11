const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

// Load environment variables from .env
const envPath = path.join(__dirname, '.env');
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

console.log("Firebase config details:");
console.log("Project ID:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  try {
    console.log("Signing in anonymously...");
    await signInAnonymously(auth);
    console.log("Signed in successfully as anonymous user:", auth.currentUser.uid);

    const colRef = collection(db, 'study_material_submissions');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(15));
    const snap = await getDocs(q);
    
    console.log(`\nFound ${snap.size} submissions:`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Title: ${data.title}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  FileUrl: ${data.fileUrl}`);
      console.log(`  UploaderName: ${data.uploaderName}`);
      console.log(`  CreatedAt: ${data.createdAt}`);
      console.log(`  isLink: ${data.isLink}`);
      console.log('------------------------------');
    });
  } catch (err) {
    console.error("Firestore query error:", err);
  }
}

run();
