import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const cleanEnvVar = (val: string | undefined) => {
  if (!val) return val;
  return val.replace(/['"]/g, '');
};

const firebaseConfig = {
  apiKey: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};

// Initialize Firebase App uniquely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth cleanly with persistence
let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e) {
    // Fallback if already initialized
    auth = getAuth(app);
  }
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Cloud Functions client securely
const functions = getFunctions(app, 'us-central1');

// Initialize Firebase App Check safely on Web platform
if (Platform.OS === 'web') {
  try {
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = require('firebase/app-check');
    
    // In local development, enable the App Check debug token securely
    if (process.env.NODE_ENV === 'development') {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const recaptchaSiteKey = cleanEnvVar(process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY) || '6Ld-NgoqAAAAAFhH7aYmQ9Bwt0qP-yY_wWzGZ1XF';
    
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (appCheckError) {
    console.warn('Firebase App Check failed to initialize securely on Web:', appCheckError);
  }
}

export { app, auth, db, functions };
