import { Alert, Platform } from 'react-native';

/**
 * Parses any incoming system/Firebase/network error and returns a clean, 
 * user-friendly, Hindi-English (Hinglish) action-oriented warning string.
 * 
 * @param error Any error object or string
 * @returns Sanitized and readable message string
 */
export function getReadableErrorMessage(error: any): string {
  if (!error) {
    return 'Kuch temporary error aaya hai. Kripya thodi der baad check karein!';
  }

  // 1. If error is a simple string
  if (typeof error === 'string') {
    const lower = error.toLowerCase();
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('offline')) {
      return 'Network connection issue! Internet verify karke fir try karein. 🌐';
    }
    if (lower.includes('permission') || lower.includes('denied') || lower.includes('unauthorized')) {
      return 'Action blocked! Aapko ye action karne ki authority nahi hai. 🔒';
    }
    if (lower.includes('cloudinary') || lower.includes('upload')) {
      return 'Photo upload limit exceed ho gayi hai. 10MB se kam size select karein! 🖼️';
    }
    return error;
  }

  // 2. Parse standard Javascript / Firebase Error Object
  const code = error.code || error.message || '';
  const message = error.message || '';

  // Extract standard code string
  const errorCode = typeof code === 'string' ? code.trim() : '';
  const errorMsg = typeof message === 'string' ? message.toLowerCase() : '';

  // App Check device integrity failures
  if (errorMsg.includes('appcheck') || errorMsg.includes('app-check') || errorMsg.includes('integrity')) {
    return 'App integrity check failed! Sahi aur official Google Play version hi chalayein. 🛡️';
  }

  // Google Sign-In Developer Error (often SHA-1 mismatch on Play Store)
  if (errorMsg.includes('developer_error') || errorCode === 'DEVELOPER_ERROR' || errorMsg.includes('12500')) {
    return 'Google Login System abhi temporarily unavailable hai. Kripya normal Email/Password se login karein ya thodi der baad try karein! 🛠️';
  }

  // Firebase Auth Error Code Mapping
  switch (errorCode) {
    case 'auth/invalid-email':
    case 'invalid-email':
      return 'Email ID ka format sahi nahi hai. Kripya correct email address type karein!';
    case 'auth/user-disabled':
    case 'user-disabled':
      return 'Aapka account block kar diya gaya hai. Kripya support desk se contact karein!';
    case 'auth/user-not-found':
    case 'user-not-found':
      return 'Is details ke sath koi account nahi mila. Pehle Sign Up (Create Account) karein!';
    case 'auth/wrong-password':
    case 'wrong-password':
      return 'Aapka Password sahi nahi hai. Sahi password dalein ya password reset karein!';
    case 'auth/email-already-in-use':
    case 'email-already-in-use':
      return 'Ye Email address pehle se register hai. Kripya direct Login page par jayein!';
    case 'auth/weak-password':
    case 'weak-password':
      return 'Password bahut weak hai! Kam se kam 6 characters ka password rakhein.';
    case 'auth/network-request-failed':
    case 'network-request-failed':
      return 'Network connectivity slow hai! Internet check karein aur dobara koshish karein. 🌐';
    case 'auth/too-many-requests':
    case 'too-many-requests':
      return 'Multiple attempts blocked! Aapka account temporal lock hai, thodi der baad try karein. ⏳';
    case 'auth/invalid-credential':
    case 'invalid-credential':
      return 'Email/Phone ya Password galat hai. Kripya credentials check karke sahi dalein!';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in system disable hai. Tech Team se contact karein.';
    case 'auth/popup-blocked':
    case 'popup-blocked':
      return 'Browser popup block ho gaya hai! Kripya settings me popups enable karein ya fast redirect login use karein. 🔓';
  }

  // Firestore & Cloud Functions Error Code Mapping
  if (errorCode === 'permission-denied' || errorCode === 'PERMISSION_DENIED' || errorMsg.includes('permission_denied') || errorMsg.includes('permission-denied')) {
    return 'Security Rules lockdown! Aapko ye data edit ya read karne ki permission nahi hai. 🔒';
  }
  if (errorCode === 'unavailable' || errorCode === 'UNAVAILABLE' || errorMsg.includes('unavailable')) {
    return 'MCE servers temporarily down hain. Kripya thodi der baad refresh karein! 🔌';
  }
  if (errorCode === 'deadline-exceeded' || errorCode === 'DEADLINE_EXCEEDED' || errorMsg.includes('timeout') || errorMsg.includes('deadline')) {
    return 'Server Response timeout! Aapka internet laggy hai, strong network me refresh karein.';
  }
  if (errorCode === 'not-found' || errorCode === 'NOT_FOUND') {
    return 'Requested item ya data delete ho chuka hai ya verify nahi hai.';
  }
  if (errorCode === 'already-exists' || errorCode === 'ALREADY_EXISTS') {
    return 'Detail (jaise username ya phone) pehle se exist karti hai, nayi custom info dalein!';
  }
  if (errorCode === 'resource-exhausted' || errorCode === 'RESOURCE_EXHAUSTED') {
    return 'Server quota limits exceed ho gayi hain. Kripya temporal delay ke baad check karein.';
  }

  // Cloudinary direct issues
  if (errorMsg.includes('cloudinary') || errorMsg.includes('signature') || errorMsg.includes('upload') || errorMsg.includes('api_key') || errorMsg.includes('api-key')) {
    return 'Photo upload me temporary delay hai! Kripya thodi der baad try karein ya size verify karein. 🖼️';
  }

  // Network checks
  if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('offline') || errorMsg.includes('no internet')) {
    return 'No Internet Connection! Server se communication fail ho gayi. Connection verify karein. 🌐';
  }

  // Return standard parsed message or a descriptive fallback
  return error.message || 'Server se connectivity standard response fail ho gayi. Thodi der baad try karein!';
}

/**
 * Standardized global alert helper. Log the raw error stack securely to the console 
 * for developer debugging, while showing a premium, friendly alert dialog to the end user.
 * 
 * @param title Branded title of the alert (e.g., 'Verification Failed')
 * @param error Any error object or string
 * @param fallbackMessage Optional fallback details
 */
export function showAppError(title: string, error: any, fallbackMessage?: string): void {
  // 1. Always output complete Stack logs to developer debug console securely
  console.error(`[ErrorManager Log] Title: ${title}`, error);

  // 2. Fetch friendly message string
  const cleanMessage = getReadableErrorMessage(error) || fallbackMessage || 'Something went wrong.';

  // 3. Display premium auto-disappearing toast notification inside the app on web, otherwise fallback
  try {
    const { useAppStore } = require('@/store/useAppStore');
    useAppStore.getState().showToast(cleanMessage, 'error');
  } catch (err) {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${cleanMessage}`);
    } else {
      Alert.alert(
        title,
        cleanMessage,
        [{ text: 'OK', style: 'cancel' }],
        { cancelable: true }
      );
    }
  }
}
