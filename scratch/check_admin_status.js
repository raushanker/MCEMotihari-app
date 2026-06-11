const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');
const path = require('path');

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
const auth = getAuth(app);
const db = getFirestore(app);

const TEST_EMAIL = 'test_voter_mce_2@mce.ac.in';
const TEST_PASSWORD = 'password123';

async function run() {
  try {
    console.log(`Signing in with ${TEST_EMAIL}...`);
    const result = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const uid = result.user.uid;
    console.log(`Signed in successfully! UID: ${uid}`);
    
    // Check publicProfile
    const profileRef = doc(db, 'publicProfiles', uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      console.log('Public Profile:', JSON.stringify(data, null, 2));
    } else {
      console.log('No public profile document found for this user.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
