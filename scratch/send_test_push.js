const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');
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
const db = getFirestore(app);

async function run() {
  try {
    console.log('Querying publicProfiles in Firestore for push tokens...');
    const q = query(collection(db, 'publicProfiles'), limit(100));
    const snap = await getDocs(q);
    
    const tokens = [];
    const profiles = [];
    
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const token = data.pushToken || data.expoPushToken;
      if (token && token.startsWith('ExponentPushToken')) {
        tokens.push(token);
        profiles.push({
          uid: docSnap.id,
          name: data.name,
          token: token
        });
      }
    });

    if (profiles.length > 0) {
      console.log(`Found ${profiles.length} profiles with Expo Push Tokens in publicProfiles.`);
    }

    console.log('Checking users collection for push tokens...');
    try {
      const uq = query(collection(db, 'users'), limit(100));
      const usnap = await getDocs(uq);
      usnap.forEach(docSnap => {
        const data = docSnap.data();
        const token = data.expoPushToken || data.pushToken;
        if (token && token.startsWith('ExponentPushToken')) {
          if (!tokens.includes(token)) {
            tokens.push(token);
            profiles.push({
              uid: docSnap.id,
              name: data.name || 'Unknown User',
              token: token
            });
          }
        }
      });
    } catch (usersErr) {
      console.warn('Could not query users collection directly due to Firestore security rules (skipping):', usersErr.message || usersErr);
    }
    
    console.log(`Total unique profiles/users with Expo Push Tokens found:`, JSON.stringify(profiles, null, 2));

    if (tokens.length === 0) {
      console.error('No push tokens found. Please run the app on your phone first so it registers a push token in Firestore.');
      return;
    }

    console.log(`\nSending push notification to ${tokens.length} devices...`);

    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: '🔥 Live Background Push Test',
      body: `Aapka push notification setup perfectly work kar raha hai! Sent at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
      priority: 'high',
      channelId: 'default',
      data: { url: '/notifications' }
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Push send API result:', JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
