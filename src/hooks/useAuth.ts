import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  signOut, 
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

export interface Experience {
  id: string;
  role: string;
  company: string;
  employmentType: 'Full-time' | 'Part-time' | 'Internship';
  startMonth: string;
  startYear: string;
  endMonth?: string;
  endYear?: string;
  isCurrent: boolean;
  description?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
  role: 'Student' | 'Alumni' | 'Faculty' | 'Other';
  rollNo?: string;
  regNo?: string;
  batch?: string;
  department?: string;
  phone?: string;
  hasPassword?: boolean;
  isVerified: boolean;
  bio?: string;
  experiences?: Experience[];
  username?: string;
  usernameLastChangedAt?: string;
}


async function generateAndClaimUsername(name: string, uid: string): Promise<string> {
  const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  let isUnique = false;
  let username = '';
  let attempts = 0;
  
  while (!isUnique && attempts < 15) {
    // Generate a 3 to 4 digit combination (e.g. between 100 and 9999)
    const randomNum = Math.floor(100 + Math.random() * 9900);
    username = `${baseName}${randomNum}`;
    
    try {
      const usernameDocRef = doc(db, 'usernames', username);
      const usernameDocSnap = await getDoc(usernameDocRef);
      if (!usernameDocSnap.exists()) {
        isUnique = true;
        await setDoc(usernameDocRef, { uid });
      }
    } catch (e) {
      console.warn('Error checking username uniqueness:', e);
    }
    attempts++;
  }
  
  // Fallback to timestamp if attempts fail
  if (!username) {
    username = `${baseName}${String(Date.now()).slice(-4)}`;
    try {
      await setDoc(doc(db, 'usernames', username), { uid });
    } catch (e) {
      console.error('Final fallback username claim failed:', e);
    }
  }
  return username;
}

export function useAuth() {
  const { user, setUser, logout: storeLogout } = useAppStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync auth state changes with Zustand store
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const [publicDoc, privateDoc] = await Promise.all([
            getDoc(doc(db, 'publicProfiles', firebaseUser.uid)),
            getDoc(doc(db, 'privateUsers', firebaseUser.uid))
          ]);
          if (publicDoc.exists() || privateDoc.exists()) {
            const data = { ...(publicDoc.data() || {}), ...(privateDoc.data() || {}) };

            // SELF-HEALING SYNC FOR EXISTING USERS:
            // Ensure they have their emailLookup entries created silently in the background
            if (data.email) {
              if (data.username) {
                try {
                  await setDoc(doc(db, 'emailLookup', data.username.toLowerCase()), { email: data.email }, { merge: true });
                } catch(e) {}
              }
              if (data.phone) {
                try {
                  await setDoc(doc(db, 'emailLookup', data.phone.trim()), { email: data.email }, { merge: true });
                } catch(e) {}
              }
            }

            setUser(data as UserProfile);
          }
        } catch (e) {
          console.error('Failed to restore real-time Firestore profile:', e);
        }
      }
    });
    return unsubscribe;
  }, []);

  // Firebase Google Sign-In (Web popup support, with native developer fallback guide)
  const loginWithGoogle = async (): Promise<{ success: boolean; isNewUser?: boolean }> => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        const { GoogleAuthProvider, signInWithPopup } = require('firebase/auth');
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;

        const [publicSnap, privateSnap] = await Promise.all([
          getDoc(doc(db, 'publicProfiles', firebaseUser.uid)),
          getDoc(doc(db, 'privateUsers', firebaseUser.uid))
        ]);

        let isNewUser = false;
        let profile: UserProfile;
        if (publicSnap.exists() || privateSnap.exists()) {
          profile = { ...(publicSnap.data() || {}), ...(privateSnap.data() || {}) } as UserProfile;
        } else {
          isNewUser = true;
          const defaultUsername = await generateAndClaimUsername(firebaseUser.displayName || 'user', firebaseUser.uid);
          profile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'B.Tech Student',
            email: firebaseUser.email || '',
            photoUrl: firebaseUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix',
            role: 'Student',
            isVerified: true,
            username: defaultUsername,
          };
          
          const { email, phone, rollNo, regNo, hasPassword, ...publicData } = profile as any;
          const privateData = { email, phone, rollNo, regNo, hasPassword };
          Object.keys(privateData).forEach(key => privateData[key as keyof typeof privateData] === undefined && delete privateData[key as keyof typeof privateData]);
          
          await Promise.all([
            setDoc(doc(db, 'publicProfiles', firebaseUser.uid), publicData),
            setDoc(doc(db, 'privateUsers', firebaseUser.uid), privateData),
            setDoc(doc(db, 'emailLookup', defaultUsername.toLowerCase()), { email: firebaseUser.email || '' })
          ]);
        }

        await setUser(profile);
        return { success: true, isNewUser };
      } else {
        throw new Error('Google Sign-In can only be used on Web in this build. For security, mobile fast-login bypass is disabled in production builds. Please use Email/Phone login.');
      }
    } catch (e: any) {
      console.error(e);
      if (Platform.OS === 'web') {
        alert(e.message || 'Google authentication failed.');
      } else {
        Alert.alert('Google Sign-In Error', e.message || 'Failed to authenticate.');
      }
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Email & Password Sign Up (Registration)
  const registerWithEmail = async (emailInput: string, passwordInput: string, nameInput: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput;
    const cleanName = nameInput.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }

    setIsLoading(true);
    try {
      const { createUserWithEmailAndPassword } = require('firebase/auth');
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const firebaseUser = result.user;

      // Create a user profile document in Firestore
      const defaultUsername = await generateAndClaimUsername(cleanName, firebaseUser.uid);
      const profile: UserProfile = {
        uid: firebaseUser.uid,
        name: cleanName,
        email: cleanEmail,
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix',
        role: 'Student',
        isVerified: true,
        username: defaultUsername,
      };

      const { email, phone, rollNo, regNo, hasPassword, ...publicData } = profile as any;
      const privateData = { email, phone, rollNo, regNo, hasPassword };
      Object.keys(privateData).forEach(key => privateData[key as keyof typeof privateData] === undefined && delete privateData[key as keyof typeof privateData]);
      
      await Promise.all([
        setDoc(doc(db, 'publicProfiles', firebaseUser.uid), publicData),
        setDoc(doc(db, 'privateUsers', firebaseUser.uid), privateData),
        setDoc(doc(db, 'emailLookup', defaultUsername.toLowerCase()), { email: cleanEmail })
      ]);

      await setUser(profile);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Failed to register.';
      if (e.code === 'auth/email-already-in-use') {
        errorMsg = 'This email address is already in use.';
      } else if (e.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address.';
      } else if (e.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak.';
      }
      return { success: false, error: e.message || errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Email & Password / Phone & Password Sign In
  const loginWithEmail = async (identifierInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    const cleanIdentifier = identifierInput.trim();
    const cleanPassword = passwordInput;

    if (!cleanIdentifier) {
      return { success: false, error: 'Kripya apna email, username ya mobile number darj karein.' };
    }
    if (!cleanPassword) {
      return { success: false, error: 'Kripya apna password darj karein.' };
    }

    setIsLoading(true);
    try {
      let emailToAuth = cleanIdentifier.toLowerCase();

      if (!emailToAuth.includes('@')) {
        try {
          const lookupDocSnap = await getDoc(doc(db, 'emailLookup', cleanIdentifier.toLowerCase()));
          if (lookupDocSnap.exists()) {
            emailToAuth = lookupDocSnap.data().email;
          } else {
            setIsLoading(false);
            const isPhoneNumber = /^[0-9]{10}$/.test(cleanIdentifier);
            if (isPhoneNumber) {
              return { success: false, error: 'Is mobile number ke saath koi account nahi mila.' };
            } else {
              return { success: false, error: 'Is username ke saath koi account nahi mila.' };
            }
          }
        } catch (dbErr: any) {
          setIsLoading(false);
          return { success: false, error: 'Database lookup fail ho gaya. Kripya details check karein.' };
        }
      }

      const { signInWithEmailAndPassword } = require('firebase/auth');
      const result = await signInWithEmailAndPassword(auth, emailToAuth, cleanPassword);
      const firebaseUser = result.user;

      // Fetch user profile from Firestore
      const [publicSnap, privateSnap] = await Promise.all([
        getDoc(doc(db, 'publicProfiles', firebaseUser.uid)),
        getDoc(doc(db, 'privateUsers', firebaseUser.uid))
      ]);

      let profile: UserProfile;
      if (publicSnap.exists() || privateSnap.exists()) {
        profile = { ...(publicSnap.data() || {}), ...(privateSnap.data() || {}) } as UserProfile;
      } else {
        profile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'B.Tech Student',
          email: firebaseUser.email || emailToAuth,
          photoUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix',
          role: 'Student',
          isVerified: true,
        };
        const { email, phone, rollNo, regNo, hasPassword, ...publicData } = profile as any;
        const privateData = { email, phone, rollNo, regNo, hasPassword };
        Object.keys(privateData).forEach(key => privateData[key as keyof typeof privateData] === undefined && delete privateData[key as keyof typeof privateData]);
        
        await Promise.all([
          setDoc(doc(db, 'publicProfiles', firebaseUser.uid), publicData),
          setDoc(doc(db, 'privateUsers', firebaseUser.uid), privateData)
        ]);
      }

      await setUser(profile);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Failed to sign in.';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        errorMsg = 'Email/Phone ya Password galat hai.';
      }
      return { success: false, error: e.message || errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Update Academic Profile in Firestore and Zustand
  const updateAcademicProfile = async (
    role: 'Student' | 'Alumni' | 'Faculty' | 'Other',
    rollNo?: string,
    regNo?: string,
    department?: string,
    batch?: string,
    bio?: string,
    photoUrl?: string,
    name?: string,
    username?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not logged in' };

    setIsLoading(true);
    try {
      const cleanName = name?.trim() || user.name;
      const cleanUsername = username?.trim().toLowerCase() || user.username || '';

      // 1. Strict Validation Rules for each Role
      if (role === 'Student') {
        // Roll number - strictly 5 digits (Required)
        const cleanRoll = (rollNo || '').trim();
        if (!cleanRoll || cleanRoll.length !== 5 || isNaN(Number(cleanRoll))) {
          setIsLoading(false);
          return { success: false, error: 'Student ke liye MCE Roll Number (exactly 5 digits) required hai!' };
        }
        // Registration number - strictly 11 digits (Required)
        const cleanReg = (regNo || '').trim();
        if (!cleanReg || cleanReg.length !== 11 || isNaN(Number(cleanReg))) {
          setIsLoading(false);
          return { success: false, error: 'Student ke liye Registration Number (exactly 11 digits) required hai!' };
        }
        // Academic Batch - (Required)
        if (!batch || !batch.trim()) {
          setIsLoading(false);
          return { success: false, error: 'Student ke liye Academic Batch Years required hai!' };
        }
        // Department / Branch - (Required)
        if (!department || !department.trim()) {
          setIsLoading(false);
          return { success: false, error: 'Student ke liye Department / Branch select karna required hai!' };
        }
      } else if (role === 'Alumni') {
        // Department / Branch - (Required)
        if (!department || !department.trim()) {
          setIsLoading(false);
          return { success: false, error: 'Alumni ke liye Department / Branch select karna required hai!' };
        }
        // Academic Batch / Session - (Required)
        if (!batch || !batch.trim()) {
          setIsLoading(false);
          return { success: false, error: 'Alumni ke liye Academic Session / Batch required hai!' };
        }
        // Roll & Reg remain optional, but if filled, we validate them
        const cleanRoll = (rollNo || '').trim();
        if (cleanRoll.length > 0 && (cleanRoll.length !== 5 || isNaN(Number(cleanRoll)))) {
          setIsLoading(false);
          return { success: false, error: 'Optional Roll Number should be exactly 5 digits!' };
        }
        const cleanReg = (regNo || '').trim();
        if (cleanReg.length > 0 && (cleanReg.length !== 11 || isNaN(Number(cleanReg)))) {
          setIsLoading(false);
          return { success: false, error: 'Optional Registration Number should be exactly 11 digits!' };
        }
      } else if (role === 'Faculty') {
        // Department / Branch - (Required)
        if (!department || !department.trim()) {
          setIsLoading(false);
          return { success: false, error: 'Faculty ke liye Department selection required hai!' };
        }
      }

      // 2. Custom Unique Username Claims Logic
      if (cleanUsername) {
        if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
          setIsLoading(false);
          return { success: false, error: 'Username me sirf chote letters, numbers aur underscores ho sakte hain (3-20 characters)!' };
        }
        if (!/[a-z]/.test(cleanUsername)) {
          setIsLoading(false);
          return { success: false, error: 'Username me kam se kam ek letter (a-z) hona zaroori hai!' };
        }
        const digitCount = (cleanUsername.match(/[0-9]/g) || []).length;
        if (digitCount < 2) {
          setIsLoading(false);
          return { success: false, error: 'Username me kam se kam 2 numbers (digits) hona zaroori hai!' };
        }

        if (cleanUsername !== user.username) {
          // Check if 6 months (180 days) have passed since last change
          if (user.usernameLastChangedAt) {
            const lastChanged = new Date(user.usernameLastChangedAt).getTime();
            const sixMonthsInMs = 180 * 24 * 60 * 60 * 1000;
            const timeDiff = Date.now() - lastChanged;
            if (timeDiff < sixMonthsInMs) {
              const remainingDays = Math.ceil((sixMonthsInMs - timeDiff) / (24 * 60 * 60 * 1000));
              const nextAvailableDate = new Date(lastChanged + sixMonthsInMs);
              setIsLoading(false);
              return { 
                success: false, 
                error: `Aap username 6 mahine me sirf ek baar badal sakte hain! Aap agla change ${remainingDays} din baad (${nextAvailableDate.toLocaleDateString()}) kar payenge.` 
              };
            }
          }
        }

        const { doc, getDoc, setDoc, deleteDoc } = require('firebase/firestore');
        const usernameDocRef = doc(db, 'usernames', cleanUsername);
        const usernameDocSnap = await getDoc(usernameDocRef);

        if (usernameDocSnap.exists()) {
          const claimedUid = usernameDocSnap.data().uid;
          if (claimedUid !== user.uid) {
            setIsLoading(false);
            return { success: false, error: 'Ye username pehle se kisi aur user ne le rakha hai. Kripya koi dusra select karein!' };
          }
        }

        // Claim new username
        await setDoc(doc(db, 'usernames', cleanUsername), { uid: user.uid });
        // Map in emailLookup
        await setDoc(doc(db, 'emailLookup', cleanUsername), { email: user.email });

        // Release old username if it changed
        if (user.username && user.username.toLowerCase() !== cleanUsername) {
          try {
            await deleteDoc(doc(db, 'usernames', user.username.toLowerCase()));
            await deleteDoc(doc(db, 'emailLookup', user.username.toLowerCase()));
          } catch (e) {
            console.warn('Failed to delete old username record:', e);
          }
        }
      }

      const updatedUser: UserProfile = {
        ...user,
        name: cleanName,
        role,
        rollNo: (role === 'Student' || role === 'Alumni') ? rollNo?.trim() : undefined,
        regNo: (role === 'Student' || role === 'Alumni') ? regNo?.trim() : undefined,
        department: (role === 'Student' || role === 'Alumni' || role === 'Faculty') ? department : undefined,
        batch: (role === 'Student' || role === 'Alumni') ? batch : undefined,
        photoUrl: photoUrl || user.photoUrl,
        username: cleanUsername || user.username,
        usernameLastChangedAt: (cleanUsername && cleanUsername !== user.username) ? new Date().toISOString() : user.usernameLastChangedAt,
        isVerified: true,
      };

      const userUid = user.uid || auth.currentUser?.uid;
      if (userUid) {
        const docData = { ...updatedUser };
        const { email, phone, rollNo, regNo, hasPassword, ...publicData } = docData as any;
        const privateData = { email, phone, rollNo, regNo, hasPassword };

        Object.keys(publicData).forEach(key => publicData[key as keyof typeof publicData] === undefined && delete publicData[key as keyof typeof publicData]);
        Object.keys(privateData).forEach(key => privateData[key as keyof typeof privateData] === undefined && delete privateData[key as keyof typeof privateData]);
        
        await Promise.all([
          setDoc(doc(db, 'publicProfiles', userUid), publicData, { merge: true }),
          setDoc(doc(db, 'privateUsers', userUid), privateData, { merge: true })
        ]);
      }

      await setUser(updatedUser);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: e.message || 'Internal Firebase database error.' };
    } finally {
      setIsLoading(false);
    }
  };
  // Configure Phone & Password
  const configurePassword = async (phone: string, password: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { updatePassword } = require('firebase/auth');
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, password);
      }

      const updatedUser: UserProfile = {
        ...user,
        phone: phone.trim() || user.phone || '',
        hasPassword: true,
      };

      const userUid = user.uid || auth.currentUser?.uid;
      if (userUid) {
        await setDoc(doc(db, 'privateUsers', userUid), { 
          phone: phone.trim() || user.phone || '', 
          hasPassword: true 
        }, { merge: true });

        // Also map phone -> email in emailLookup!
        if (phone.trim()) {
          await setDoc(doc(db, 'emailLookup', phone.trim()), { email: user.email });
        }
        
        // Release old phone lookup if changed
        if (user.phone && user.phone !== phone.trim()) {
          try {
            const { deleteDoc } = require('firebase/firestore');
            await deleteDoc(doc(db, 'emailLookup', user.phone));
          } catch(e) {}
        }
      }

      await setUser(updatedUser);
      return true;
    } catch (e) {
      console.error('Failed to configure password:', e);
      return false;
    }
  };
  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      await storeLogout();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    updateAcademicProfile,
    configurePassword,
    logout,
  };
}
