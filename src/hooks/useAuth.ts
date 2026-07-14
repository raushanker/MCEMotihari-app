import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, functions } from "../config/firebase";
import { httpsCallable } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Alert } from "react-native";
import {
  getReadableErrorMessage,
  showAppError,
} from "@/utils/errors/errorManager";
import { getCachedProfile, setCachedProfile } from "@/utils/profileCache";
import { sanitizeFirestoreData } from "@/utils/firestoreUtils";
import { validateDisplayName, cleanDisplayName } from "@/utils/nameValidator";

if (Platform.OS !== "web") {
  try {
    const {
      GoogleSignin,
    } = require("@react-native-google-signin/google-signin");
    GoogleSignin.configure({
      webClientId:
        "1071649927142-3eiqc4udb7eqk84v1dbns0qigmio6slo.apps.googleusercontent.com",
      offlineAccess: true,
    });
  } catch (e) {
    console.error("Failed to configure Google Sign-In:", e);
  }
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  employmentType: "Full-time" | "Part-time" | "Internship";
  startMonth: string;
  startYear: string;
  endMonth?: string;
  endYear?: string;
  isCurrent: boolean;
  description?: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
  description?: string;
}

export interface Publication {
  id: string;
  title: string;
  publisher: string;
  publicationDate: string;
  url?: string;
  authors?: string;
  description?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
  role: "Student" | "Alumni" | "Faculty" | "Other";
  rollNo?: string;
  regNo?: string;
  batch?: string;
  department?: string;
  phone?: string;
  hasPassword?: boolean;
  pushToken?: string;
  deptFacultyAdminRoles?: string[];
  isVerified?: boolean;
  bio?: string;
  experiences?: Experience[];
  education?: Education[];
  publications?: Publication[];
  username?: string;
  usernameLastChangedAt?: string;
  isBatchPrivate?: boolean;
  isDeptPrivate?: boolean;
  adminRole?: string;
  status?: "active" | "suspended" | "banned";
  createdAt?: string;
}

async function generateAndClaimUsername(
  name: string,
  uid: string
): Promise<string> {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  const nameParts = cleanName.split(/\s+/);

  let firstName = nameParts[0] || "user";
  let fullNameStr = nameParts.join("");

  const generateVariations = (base: string, digitCount: number) => {
    const min = Math.pow(10, digitCount - 1);
    const max = Math.pow(10, digitCount) - 1;
    return `${base}${Math.floor(min + Math.random() * (max - min + 1))}`;
  };

  let isUnique = false;
  let username = "";
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    let currentBase = firstName;
    let digits = 2;

    if (attempts >= 3 && attempts < 6) {
      currentBase = firstName;
      digits = 3;
    } else if (attempts >= 6) {
      currentBase = fullNameStr;
      digits = 2;
    }

    // Ensure the total length is at least 5 characters to pass validation
    while (currentBase.length + digits < 5) {
      currentBase += "0";
    }

    username = generateVariations(currentBase, digits);

    try {
      const usernameDocRef = doc(db, "usernames", username);
      const usernameDocSnap = await getDoc(usernameDocRef);
      if (!usernameDocSnap.exists()) {
        isUnique = true;
        await setDoc(usernameDocRef, { uid });
      }
    } catch (e) {
      console.warn("Error checking username uniqueness:", e);
    }
    attempts++;
  }

  // Fallback to timestamp if attempts fail
  if (!isUnique) {
    let finalBase = firstName;
    while (finalBase.length < 3) finalBase += "0";
    username = `${finalBase}${String(Date.now()).slice(-4)}`;
    try {
      await setDoc(doc(db, "usernames", username), { uid });
    } catch (e) {
      console.error("Final fallback username claim failed:", e);
    }
  }
  return username;
}

export function useAuth() {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const storeLogout = useAppStore((state) => state.logout);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync auth state changes with Zustand store & resolve web redirect logins
  useEffect(() => {
    if (Platform.OS === "web") {
      const { getRedirectResult } = require("firebase/auth");
      getRedirectResult(auth)
        .then(async (result: any) => {
          if (result && result.user) {
            setIsLoading(true);
            try {
              await handleFirebaseUserSignIn(result.user);
            } catch (err) {
              console.error("Failed to process redirect sign-in user:", err);
              showAppError("Authentication Failed", err);
            } finally {
              setIsLoading(false);
            }
          }
        })
        .catch((err: any) => {
          console.error("Google Redirect Sign-In error:", err);
          showAppError("Google Login Error", err);
          setIsLoading(false); // Ensure loading state is released on redirect or cookie blocker errors
        });
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        try {
          if (firebaseUser) {
            // Local First Strategy: Load cache instantly
            try {
              const cachedData = await getCachedProfile(firebaseUser.uid);
              if (cachedData) {
                setUser({ ...cachedData, uid: firebaseUser.uid });
                setIsLoading(false); // allow UI to render instantly
              }
            } catch (e) {}

            const [publicDoc, privateDoc] = await Promise.all([
              getDoc(doc(db, "publicProfiles", firebaseUser.uid)),
              getDoc(doc(db, "privateUsers", firebaseUser.uid)),
            ]);
            if (publicDoc.exists() || privateDoc.exists()) {
              const data = {
                ...(publicDoc.data() || {}),
                ...(privateDoc.data() || {}),
              };

              // SELF-HEALING SYNC FOR EXISTING USERS:
              // Ensure they have their emailLookup entries created silently in the background
              if (data.email) {
                if (data.username) {
                  try {
                    await setDoc(
                      doc(db, "emailLookup", data.username.toLowerCase()),
                      { email: data.email },
                      { merge: true }
                    );
                  } catch (e) {}
                }
                if (data.phone) {
                  try {
                    await setDoc(
                      doc(db, "emailLookup", data.phone.trim()),
                      { email: data.email },
                      { merge: true }
                    );
                  } catch (e) {}
                }
              }

              // Ensure lowercase UID mapping is created silently in the background
              try {
                await setDoc(
                  doc(db, "usernames", firebaseUser.uid.toLowerCase()),
                  { uid: firebaseUser.uid },
                  { merge: true }
                );
              } catch (e) {}

              setUser({ ...data, uid: firebaseUser.uid } as UserProfile);
            }
          } else {
            await storeLogout();
          }
        } catch (e) {
          console.error("Failed to restore real-time Firestore profile:", e);
        } finally {
          setIsLoading(false);
        }
      }
    );
    return unsubscribe;
  }, [setUser, storeLogout]);

  // Firestore profile syncing helper
  const handleFirebaseUserSignIn = async (
    firebaseUser: any
  ): Promise<{ success: boolean; isNewUser?: boolean }> => {
    console.log("[Auth Flow] 3. Create/Fetch Firestore Profile - Checking existing profile...");
    const [publicSnap, privateSnap] = await Promise.all([
      getDoc(doc(db, "publicProfiles", firebaseUser.uid)),
      getDoc(doc(db, "privateUsers", firebaseUser.uid)),
    ]);

    let isNewUser = false;
    let profile: UserProfile;
    if (publicSnap.exists() || privateSnap.exists()) {
      profile = {
        ...(publicSnap.data() || {}),
        ...(privateSnap.data() || {}),
      } as UserProfile;

      // Self-healing emailLookup entries
      if (profile.email) {
        if (profile.username) {
          try {
            await setDoc(
              doc(db, "emailLookup", profile.username.toLowerCase()),
              { email: profile.email },
              { merge: true }
            );
          } catch (e) {}
        }
        if (profile.phone) {
          try {
            await setDoc(
              doc(db, "emailLookup", profile.phone.trim()),
              { email: profile.email },
              { merge: true }
            );
          } catch (e) {}
        }
      }

      // Ensure lowercase UID mapping exists in usernames collection for robust profile routes
      try {
        await setDoc(
          doc(db, "usernames", firebaseUser.uid.toLowerCase()),
          { uid: firebaseUser.uid },
          { merge: true }
        );
      } catch (e) {
        console.warn("[Auth Flow] Failed to ensure lowercase UID mapping:", e);
      }
      console.log("[Auth Flow] 3a. Profile found and synced.");
    } else {
      console.log("[Auth Flow] 3b. Profile not found. Creating new profile...");
      isNewUser = true;
      const defaultUsername = await generateAndClaimUsername(
        firebaseUser.displayName || "user",
        firebaseUser.uid
      );
      let safeName = (firebaseUser.displayName || "B.Tech Student").trim();
      if (!safeName.includes(" ")) {
        safeName += " User";
      }
      
      profile = {
        uid: firebaseUser.uid,
        name: safeName,
        email: firebaseUser.email || "",
        photoUrl:
          firebaseUser.photoURL ||
          "https://api.dicebear.com/7.x/avataaars/png?seed=Felix",
        role: "Student",
        username: defaultUsername,
        createdAt: new Date().toISOString(),
      };

      const { email, phone, rollNo, regNo, hasPassword, ...publicData } =
        profile as any;
      const privateData = { email, phone, rollNo, regNo, hasPassword };
      Object.keys(privateData).forEach(
        (key) =>
          privateData[key as keyof typeof privateData] === undefined &&
          delete privateData[key as keyof typeof privateData]
      );

      try {
        await setDoc(doc(db, "publicProfiles", firebaseUser.uid), publicData);
      } catch (err) {
        console.error("Failed to create publicProfile:", err);
        throw err; // Critical failure
      }

      try {
        await setDoc(doc(db, "privateUsers", firebaseUser.uid), privateData);
      } catch (err) {
        console.error("Failed to create privateUser:", err);
        throw err; // Critical failure
      }

      try {
        await setDoc(doc(db, "emailLookup", defaultUsername.toLowerCase()), {
          email: firebaseUser.email || "",
        });
      } catch (err) {
        console.error("Failed to create emailLookup:", err);
        // Non-critical, continue
      }

      try {
        await setDoc(doc(db, "usernames", firebaseUser.uid.toLowerCase()), {
          uid: firebaseUser.uid,
        });
      } catch (err) {
        console.error("[Auth Flow] Failed to create usernames mapping:", err);
        // Non-critical, continue
      }
      console.log("[Auth Flow] 3c. New profile created successfully.");
    }

    console.log("[Auth Flow] 4. Dashboard - Updating local Zustand state...");
    await setUser(profile);
    console.log("[Auth Flow] Flow complete.");
    return { success: true, isNewUser };
  };

  // Firebase Google Sign-In with full native cross-platform support
  const loginWithGoogle = async (): Promise<{
    success: boolean;
    isNewUser?: boolean;
  }> => {
    console.log("[Auth Flow] 1. Google Sign In initiated...");
    setIsLoading(true);
    try {
      if (Platform.OS === "web") {
        const {
          GoogleAuthProvider,
          signInWithPopup,
          signInWithRedirect,
        } = require("firebase/auth");
        const provider = new GoogleAuthProvider();

        try {
          // Try Popup first (Instant, smooth, same-screen authentication)
          const result = await signInWithPopup(auth, provider);
          return await handleFirebaseUserSignIn(result.user);
        } catch (popupErr: any) {
          // If browser popup blocks, fall back to Redirect immediately
          if (
            popupErr.code === "auth/popup-blocked" ||
            popupErr.message?.includes("popup") ||
            popupErr.message?.includes("block")
          ) {
            console.log(
              "Google login popup blocked. Falling back to Redirect mode...",
              popupErr
            );
            useAppStore
              .getState()
              .showToast(
                "Popup blocked! Secure redirecting to Google... 🔒",
                "info"
              );
            await signInWithRedirect(auth, provider);
            return { success: true };
          }
          throw popupErr;
        }
      } else {
        const {
          GoogleSignin,
        } = require("@react-native-google-signin/google-signin");
        const {
          GoogleAuthProvider,
          signInWithCredential,
        } = require("firebase/auth");

        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
        const response = await GoogleSignin.signIn();

        // GoogleSignin returns { idToken } or { data: { idToken } } depending on version
        let idToken = response?.idToken;
        if (response?.data && response.data.idToken) {
          idToken = response.data.idToken;
        }

        if (!idToken) {
          throw new Error(
            "Authentication process was incomplete. Please check your connection or try again."
          );
        }

        console.log("[Auth Flow] 2. Firebase Auth - Authenticating with Google Credential...");
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        console.log("[Auth Flow] Firebase Auth successful for UID:", result.user.uid);
        return await handleFirebaseUserSignIn(result.user);
      }
    } catch (e: any) {
      console.error("[Auth Flow] Google Login Error:", e);
      if (Platform.OS === "web") {
        showAppError("Google Login Error", e);
      } else {
        const friendlyMsg = getReadableErrorMessage(e);
        // Handle cancel code silently, otherwise alert error
        const isCancelled =
          e.code === "SIGN_IN_CANCELLED" ||
          e.message?.toLowerCase().includes("cancel") ||
          e.code === "12501";
          
        if (!isCancelled) {
          Alert.alert(
            "Authentication Failed",
            "We encountered an issue while connecting to your Google account.\n\nReason: " +
              friendlyMsg,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Try Again", onPress: () => loginWithGoogle() },
            ]
          );
        }
      }
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Email & Password Sign Up (Registration)
  const registerWithEmail = async (
    emailInput: string,
    passwordInput: string,
    nameInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput;
    const cleanName = nameInput.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters long.",
      };
    }
    if (!cleanName) {
      return { success: false, error: "Please enter your full name." };
    }

    setIsLoading(true);
    try {
      const { createUserWithEmailAndPassword } = require("firebase/auth");
      const result = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        cleanPassword
      );
      const firebaseUser = result.user;

      // Create a user profile document in Firestore
      const defaultUsername = await generateAndClaimUsername(
        cleanName,
        firebaseUser.uid
      );
      const profile: UserProfile = {
        uid: firebaseUser.uid,
        name: cleanName,
        email: cleanEmail,
        photoUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=Felix",
        role: "Student",
        username: defaultUsername,
        createdAt: new Date().toISOString(),
      };

      const { email, phone, rollNo, regNo, hasPassword, ...publicData } =
        profile as any;
      const privateData = { email, phone, rollNo, regNo, hasPassword };
      Object.keys(privateData).forEach(
        (key) =>
          privateData[key as keyof typeof privateData] === undefined &&
          delete privateData[key as keyof typeof privateData]
      );

      await Promise.all([
        setDoc(doc(db, "publicProfiles", firebaseUser.uid), publicData),
        setDoc(doc(db, "privateUsers", firebaseUser.uid), privateData),
        setDoc(doc(db, "emailLookup", defaultUsername.toLowerCase()), {
          email: cleanEmail,
        }),
        setDoc(doc(db, "usernames", firebaseUser.uid.toLowerCase()), {
          uid: firebaseUser.uid,
        }),
      ]);

      await setUser(profile);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: getReadableErrorMessage(e) };
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Email & Password / Phone & Password Sign In
  const loginWithEmail = async (
    identifierInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanIdentifier = identifierInput.trim();
    const cleanPassword = passwordInput;

    if (!cleanIdentifier) {
      return {
        success: false,
        error: "Kripya apna email, username ya mobile number darj karein.",
      };
    }
    if (!cleanPassword) {
      return { success: false, error: "Kripya apna password darj karein." };
    }

    setIsLoading(true);
    try {
      let emailToAuth = cleanIdentifier.toLowerCase();

      if (!emailToAuth.includes("@")) {
        try {
          const lookupEmailFn = httpsCallable(functions, "lookupEmail");
          const result = await lookupEmailFn({ identifier: cleanIdentifier });
          if (result && result.data && (result.data as any).email) {
            emailToAuth = (result.data as any).email;
          } else {
            setIsLoading(false);
            return {
              success: false,
              error: "Is account ke saath koi email nahi mila.",
            };
          }
        } catch (funcErr: any) {
          setIsLoading(false);
          return { success: false, error: getReadableErrorMessage(funcErr) };
        }
      }

      const { signInWithEmailAndPassword } = require("firebase/auth");
      const result = await signInWithEmailAndPassword(
        auth,
        emailToAuth,
        cleanPassword
      );
      const firebaseUser = result.user;

      // Fetch user profile from Firestore
      const [publicSnap, privateSnap] = await Promise.all([
        getDoc(doc(db, "publicProfiles", firebaseUser.uid)),
        getDoc(doc(db, "privateUsers", firebaseUser.uid)),
      ]);

      let profile: UserProfile;
      if (publicSnap.exists() || privateSnap.exists()) {
        profile = {
          ...(publicSnap.data() || {}),
          ...(privateSnap.data() || {}),
        } as UserProfile;
      } else {
        const defaultUsername = await generateAndClaimUsername(
          firebaseUser.displayName || "New User",
          firebaseUser.uid
        );
        profile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "New User",
          email: firebaseUser.email || emailToAuth,
          photoUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=Felix",
          role: "Student",
          username: defaultUsername,
          createdAt: new Date().toISOString(),
        };
        const { email, phone, rollNo, regNo, hasPassword, ...publicData } =
          profile as any;
        const privateData = { email, phone, rollNo, regNo, hasPassword };
        Object.keys(privateData).forEach(
          (key) =>
            privateData[key as keyof typeof privateData] === undefined &&
            delete privateData[key as keyof typeof privateData]
        );

        await Promise.all([
          setDoc(doc(db, "publicProfiles", firebaseUser.uid), publicData),
          setDoc(doc(db, "privateUsers", firebaseUser.uid), privateData),
          setDoc(doc(db, "emailLookup", defaultUsername.toLowerCase()), {
            email: profile.email,
          }),
          setDoc(doc(db, "usernames", firebaseUser.uid.toLowerCase()), {
            uid: firebaseUser.uid,
          }),
        ]);
      }

      await setUser(profile);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: getReadableErrorMessage(e) };
    } finally {
      setIsLoading(false);
    }
  };

  // Update Academic Profile in Firestore and Zustand
  const updateAcademicProfile = async (
    role: "Student" | "Alumni" | "Faculty" | "Other",
    rollNo?: string,
    regNo?: string,
    department?: string,
    batch?: string,
    bio?: string,
    photoUrl?: string,
    name?: string,
    username?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      console.error(
        "[Registration] updateAcademicProfile failed: User not logged in (Zustand state is null)"
      );
      return { success: false, error: "User not logged in" };
    }

    const { auth } = require("../config/firebase");
    if (!auth.currentUser) {
      console.error(
        "[Registration] updateAcademicProfile failed: auth.currentUser is null. Auth state might be disconnected."
      );
      return { success: false, error: "Auth session expired" };
    }

    setIsLoading(true);
    try {
      console.log(
        `[Registration] Starting updateAcademicProfile for uid: ${user.uid}`
      );

      // 1. Name Formatting & Validation
      let cleanName = cleanDisplayName(name || user.name || "");
      if (cleanName) {
        const nameErr = validateDisplayName(cleanName);
        if (nameErr) {
          console.error(
            "[Registration] Name validation failed:",
            cleanName,
            nameErr
          );
          return { success: false, error: nameErr };
        }
      }

      const requestedUsername = username?.trim().toLowerCase();
      const shouldUpdateUsername =
        !!requestedUsername && requestedUsername !== user.username;
      const cleanUsername = requestedUsername || user.username || "";

      if (role === "Student") {
        const cleanRoll = (rollNo || "").trim();
        const hasFakeRoll =
          /(.)\1{4,}/.test(cleanRoll) ||
          /12345/.test(cleanRoll) ||
          /54321/.test(cleanRoll) ||
          /01234/.test(cleanRoll);
        if (
          !cleanRoll ||
          cleanRoll.length !== 5 ||
          isNaN(Number(cleanRoll)) ||
          hasFakeRoll
        ) {
          return {
            success: false,
            error: "Please enter a valid 5-digit MCE roll number.",
          };
        }
        const cleanReg = (regNo || "").trim();
        const hasFakeReg =
          /(.)\1{10,}/.test(cleanReg) ||
          /0123456789/.test(cleanReg) ||
          /1234567890/.test(cleanReg) ||
          /9876543210/.test(cleanReg);
        if (
          !cleanReg ||
          cleanReg.length !== 11 ||
          isNaN(Number(cleanReg)) ||
          hasFakeReg
        ) {
          return {
            success: false,
            error: "Please enter a valid 11-digit registration number.",
          };
        }
        if (!batch || !batch.trim())
          return {
            success: false,
            error: "Student ke liye Academic Batch Years required hai!",
          };
        if (!department || !department.trim())
          return {
            success: false,
            error:
              "Student ke liye Department / Branch select karna required hai!",
          };
      } else if (role === "Alumni") {
        if (!department || !department.trim())
          return {
            success: false,
            error:
              "Alumni ke liye Department / Branch select karna required hai!",
          };
        if (!batch || !batch.trim())
          return {
            success: false,
            error: "Alumni ke liye Academic Session / Batch required hai!",
          };
      }

      const { doc, getDoc, setDoc, deleteDoc } = require("firebase/firestore");

      if (shouldUpdateUsername) {
        if (!/^[a-z0-9_]{5,20}$/.test(cleanUsername))
          return {
            success: false,
            error:
              "Username me sirf chote letters, numbers aur underscores ho sakte hain (minimum 5 characters)!",
          };
        if (!/[a-z]/.test(cleanUsername))
          return {
            success: false,
            error: "Username me kam se kam ek letter (a-z) hona zaroori hai!",
          };

        if (user.usernameLastChangedAt) {
          const lastChanged = new Date(user.usernameLastChangedAt).getTime();
          const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
          if (Date.now() - lastChanged < fourteenDaysInMs) {
            return {
              success: false,
              error: `Aap username 14 din me sirf ek baar badal sakte hain!`,
            };
          }
        }

        const usernameDocRef = doc(db, "usernames", cleanUsername);
        const usernameDocSnap = await getDoc(usernameDocRef);

        if (usernameDocSnap.exists()) {
          if (usernameDocSnap.data().uid !== user.uid) {
            return {
              success: false,
              error:
                "Ye username pehle se kisi aur user ne le rakha hai. Kripya koi dusra select karein!",
            };
          }
        }

        await setDoc(doc(db, "usernames", cleanUsername), { uid: user.uid });
        await setDoc(doc(db, "emailLookup", cleanUsername), {
          email: user.email,
        });

        if (user.username && user.username.toLowerCase() !== cleanUsername) {
          try {
            await deleteDoc(doc(db, "usernames", user.username.toLowerCase()));
            await deleteDoc(
              doc(db, "emailLookup", user.username.toLowerCase())
            );
          } catch (e) {
            console.warn("Failed to delete old username record:", e);
          }
        }
      }

      const updatedUser: UserProfile = {
        ...user,
        name: cleanName,
        role,
        rollNo:
          role === "Student" || role === "Alumni" ? rollNo?.trim() : undefined,
        regNo:
          role === "Student" || role === "Alumni" ? regNo?.trim() : undefined,
        department:
          role === "Student" || role === "Alumni" || role === "Faculty"
            ? department
            : undefined,
        batch: role === "Student" || role === "Alumni" ? batch : undefined,
        photoUrl: photoUrl || user.photoUrl,
        username: cleanUsername || user.username,
        vibeStatus: bio !== undefined ? bio : user.vibeStatus,
        usernameLastChangedAt: shouldUpdateUsername
          ? new Date().toISOString()
          : user.usernameLastChangedAt,
      };

      const userUid = user.uid || auth.currentUser?.uid;

      console.log(
        "[Registration] Preparing Firestore data write for uid:",
        userUid
      );

      const docData = { ...updatedUser };
      const {
        email,
        phone,
        rollNo: rNo,
        regNo: rgNo,
        hasPassword,
        ...publicData
      } = docData as any;
      const privateData = {
        email,
        phone,
        rollNo: rNo,
        regNo: rgNo,
        hasPassword,
      };

      const sanitizedPublicData = sanitizeFirestoreData(publicData);
      const sanitizedPrivateData = sanitizeFirestoreData(privateData);

      // Remove protected fields to avoid triggering Firestore security rules
      const protectedKeys = ['adminRole', 'permissions', 'isAdmin', 'isSuperAdmin', 'claims', 'departmentAdminRoles', 'deptFacultyAdminRoles', 'verifiedBy', 'approvedBy', 'status', 'isVerified', 'isApproved'];
      protectedKeys.forEach(key => {
        delete sanitizedPublicData[key];
        delete sanitizedPrivateData[key];
      });

      console.log("[Registration] sanitizedPublicData being sent:", JSON.stringify(sanitizedPublicData, null, 2));
      console.log("[Registration] sanitizedPrivateData being sent:", JSON.stringify(sanitizedPrivateData, null, 2));

      try {
        const publicRef = doc(db, "publicProfiles", userUid);
        const privateRef = doc(db, "privateUsers", userUid);

        // Prevent duplicate wipe-out by using getDoc if doing full write, but here we just use merge: true which is safe.
        // Let's explicitly check publicProfiles to log if it existed.
        const existingSnap = await getDoc(publicRef).catch((e: any) => {
          console.warn(
            "[Registration] getDoc publicProfiles failed (offline?). Continuing with merge.",
            e
          );
        });

        if (existingSnap && existingSnap.exists()) {
          console.log(
            "[Registration] Profile already exists, updating via merge."
          );
        } else {
          console.log("[Registration] Creating new profile.");
        }

        // Enable offline queueing
        try {
          await setDoc(publicRef, sanitizedPublicData, { merge: true });
          console.log("[Registration] publicRef setDoc successful");
        } catch (e) {
          console.error("[Registration] publicRef setDoc failed:", e);
          throw e;
        }

        try {
          await setDoc(privateRef, sanitizedPrivateData, { merge: true });
          console.log("[Registration] privateRef setDoc successful");
        } catch (e) {
          console.error("[Registration] privateRef setDoc failed:", e);
          throw e;
        }

        console.log("[Registration] Firestore setDoc complete.");
      } catch (dbError: any) {
        console.error("[Registration] Firestore write failed:", dbError);
        if (
          dbError.code === "unavailable" ||
          dbError.message.includes("offline")
        ) {
          console.warn(
            "[Registration] Network is offline, data queued in local cache."
          );
        } else {
          throw dbError; // Rethrow to outer catch
        }
      }

      await setUser(updatedUser);
      return { success: true };
    } catch (e: any) {
      console.error("[Registration] updateAcademicProfile outer catch:", e);
      return { success: false, error: getReadableErrorMessage(e) };
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrivacySettings = async (
    isBatchPrivate: boolean,
    isDeptPrivate: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !auth.currentUser)
      return { success: false, error: "User not logged in" };
    setIsLoading(true);
    try {
      const publicRef = doc(db, "publicProfiles", user.uid);
      await setDoc(
        publicRef,
        { isBatchPrivate, isDeptPrivate },
        { merge: true }
      );

      const updatedUser = { ...user, isBatchPrivate, isDeptPrivate };
      await setUser(updatedUser);
      return { success: true };
    } catch (e: any) {
      console.error("Failed to update privacy settings:", e);
      return { success: false, error: getReadableErrorMessage(e) };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUsername = async (
    newUsername: string,
    newName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !auth.currentUser)
      return { success: false, error: "User not logged in" };
    setIsLoading(true);

    try {
      const cleanUsername = newUsername.trim().toLowerCase();
      let cleanName = cleanDisplayName(newName || user.name);

      if (newName) {
        const nameErr = validateDisplayName(cleanName);
        if (nameErr) {
          return { success: false, error: nameErr };
        }
      }

      const shouldUpdateUsername =
        cleanUsername && cleanUsername !== user.username;

      if (shouldUpdateUsername) {
        const {
          doc,
          getDoc,
          setDoc,
          deleteDoc,
        } = require("firebase/firestore");

        if (!/^[a-z0-9_]{5,20}$/.test(cleanUsername))
          return {
            success: false,
            error:
              "Username me sirf chote letters, numbers aur underscores ho sakte hain (minimum 5 characters)!",
          };
        if (!/[a-z]/.test(cleanUsername))
          return {
            success: false,
            error: "Username me kam se kam ek letter (a-z) hona zaroori hai!",
          };

        if (user.usernameLastChangedAt) {
          const lastChanged = new Date(user.usernameLastChangedAt).getTime();
          const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
          if (Date.now() - lastChanged < fourteenDaysInMs) {
            return {
              success: false,
              error: `Aap username 14 din me sirf ek baar badal sakte hain!`,
            };
          }
        }

        const usernameDocRef = doc(db, "usernames", cleanUsername);
        const usernameDocSnap = await getDoc(usernameDocRef);

        if (usernameDocSnap.exists()) {
          if (usernameDocSnap.data().uid !== user.uid) {
            return {
              success: false,
              error:
                "Ye username pehle se kisi aur user ne le rakha hai. Kripya koi dusra select karein!",
            };
          }
        }

        await setDoc(doc(db, "usernames", cleanUsername), { uid: user.uid });
        await setDoc(doc(db, "emailLookup", cleanUsername), {
          email: user.email,
        });

        if (user.username && user.username.toLowerCase() !== cleanUsername) {
          try {
            await deleteDoc(doc(db, "usernames", user.username.toLowerCase()));
            await deleteDoc(
              doc(db, "emailLookup", user.username.toLowerCase())
            );
          } catch (e) {}
        }
      }

      const updatedUser: UserProfile = {
        ...user,
        name: cleanName,
        username: shouldUpdateUsername ? cleanUsername : user.username,
        usernameLastChangedAt: shouldUpdateUsername
          ? new Date().toISOString()
          : user.usernameLastChangedAt,
      };

      const publicRef = doc(db, "publicProfiles", user.uid);
      const publicDataToMerge: any = { name: updatedUser.name };
      if (shouldUpdateUsername) {
        publicDataToMerge.username = updatedUser.username;
        publicDataToMerge.usernameLastChangedAt =
          updatedUser.usernameLastChangedAt;
      }

      await setDoc(publicRef, publicDataToMerge, { merge: true });
      await setUser(updatedUser);

      return { success: true };
    } catch (e: any) {
      console.error("Failed to update username/name:", e);
      return { success: false, error: getReadableErrorMessage(e) };
    } finally {
      setIsLoading(false);
    }
  };

  // Configure Phone & Password
  const configurePassword = async (
    phone: string,
    password: string
  ): Promise<boolean> => {
    if (!user) {
      console.error(
        "[Registration] configurePassword failed: user state is null"
      );
      return false;
    }

    try {
      console.log(
        "[Registration] Starting configurePassword for user:",
        user.email
      );

      const cleanPhone = phone.trim();

      if (cleanPhone && cleanPhone !== user.phone) {
        const { doc, getDoc } = require("firebase/firestore");
        const phoneLookupSnap = await getDoc(
          doc(db, "emailLookup", cleanPhone)
        );
        if (
          phoneLookupSnap.exists() &&
          phoneLookupSnap.data().email !== user.email
        ) {
          throw new Error(
            "Ye phone number pehle se kisi aur account me registered hai."
          );
        }
      }
      if (auth.currentUser && password) {
        // Safe check for password provider presence:
        const hasPasswordProvider = auth.currentUser.providerData.some(
          (p: any) => p.providerId === "password"
        );

        console.log("[Registration] hasPasswordProvider:", hasPasswordProvider);

        if (hasPasswordProvider) {
          const { updatePassword } = require("firebase/auth");
          console.log("[Registration] Updating existing password provider...");
          await updatePassword(auth.currentUser, password);
        } else {
          const {
            EmailAuthProvider,
            linkWithCredential,
          } = require("firebase/auth");
          console.log("[Registration] Linking new password credential...");
          const credential = EmailAuthProvider.credential(
            auth.currentUser.email!,
            password
          );
          await linkWithCredential(auth.currentUser, credential);
        }
        console.log("[Registration] Auth credential configured successfully.");
      } else if (!auth.currentUser) {
        console.error(
          "[Registration] configurePassword failed: auth.currentUser is null"
        );
      }

      const latestUser = require("@/store/useAppStore").useAppStore.getState()
        .user;

      const updatedUser: UserProfile = {
        ...latestUser,
        phone: cleanPhone || latestUser?.phone || "",
        hasPassword: !!password || latestUser?.hasPassword,
      };

      const userUid = latestUser?.uid || auth.currentUser?.uid;
      if (userUid) {
        await setDoc(
          doc(db, "privateUsers", userUid),
          {
            phone: cleanPhone || latestUser?.phone || "",
            hasPassword: !!password || latestUser?.hasPassword,
          },
          { merge: true }
        );

        // Also map phone -> email in emailLookup!
        if (cleanPhone && cleanPhone !== latestUser?.phone) {
          await setDoc(doc(db, "emailLookup", cleanPhone), {
            email: latestUser?.email,
          });
          // Optional: remove old phone mapping if it existed
          if (latestUser?.phone) {
            try {
              const { deleteDoc } = require("firebase/firestore");
              await deleteDoc(doc(db, "emailLookup", latestUser.phone));
            } catch (e) {}
          }
        }

        // Release old phone lookup if changed
        if (latestUser?.phone && latestUser.phone !== cleanPhone) {
          try {
            const { deleteDoc } = require("firebase/firestore");
            await deleteDoc(doc(db, "emailLookup", latestUser.phone));
          } catch (e) {}
        }
      }

      await setUser(updatedUser);
      return true;
    } catch (e: any) {
      console.error("Failed to configure password:", e);
      throw e;
    }
  };
  const checkUsernameAvailability = async (
    username: string
  ): Promise<boolean> => {
    try {
      const { doc, getDoc } = require("firebase/firestore");
      const docRef = doc(db, "usernames", username.toLowerCase().trim());
      const snap = await getDoc(docRef);
      return !snap.exists() || snap.data().uid === user?.uid;
    } catch (e) {
      console.error("Error checking username availability:", e);
      return false;
    }
  };

  const validateUsername = (username: string): string | null => {
    const clean = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{5,20}$/.test(clean))
      return "Username me sirf chote letters, numbers aur underscores ho sakte hain (minimum 5 characters)!";
    if (!/[a-z]/.test(clean))
      return "Username me kam se kam ek letter (a-z) hona zaroori hai!";
    return null;
  };

  const saveLoginSettings = async (
    username: string,
    phone: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User is not logged in." };

    setIsLoading(true);
    console.log("[LoginSettings] Validation Started");

    try {
      const cleanUsername = username.toLowerCase().trim();
      const cleanPhone = phone.trim();
      const hasPasswordInput =
        password !== undefined && password.trim().length > 0;

      const isUsernameChanging = cleanUsername !== (user.username || "");
      const isPhoneChanging = cleanPhone !== (user.phone || "");
      const isPasswordChanging = hasPasswordInput;

      if (!isUsernameChanging && !isPhoneChanging && !isPasswordChanging) {
        console.log("[LoginSettings] No changes detected");
        return { success: true };
      }

      if (isUsernameChanging) {
        if (user.usernameLastChangedAt) {
          const lastChanged = new Date(user.usernameLastChangedAt).getTime();
          if (Date.now() - lastChanged < 14 * 24 * 60 * 60 * 1000) {
            return {
              success: false,
              error: "Aap username 14 din me sirf ek baar badal sakte hain!",
            };
          }
        }

        const usernameError = validateUsername(cleanUsername);
        if (usernameError) return { success: false, error: usernameError };

        console.log("[LoginSettings] Username Check:", cleanUsername);
        const isAvailable = await checkUsernameAvailability(cleanUsername);
        if (!isAvailable)
          return {
            success: false,
            error: "Ye username pehle se kisi aur user ne le rakha hai.",
          };
      }

      if (isPhoneChanging) {
        if (cleanPhone.length !== 10)
          return {
            success: false,
            error: "Phone number must be exactly 10 digits.",
          };
        const { doc, getDoc } = require("firebase/firestore");
        const phoneLookupSnap = await getDoc(
          doc(db, "emailLookup", cleanPhone)
        );
        if (
          phoneLookupSnap.exists() &&
          phoneLookupSnap.data().email !== user.email
        ) {
          return {
            success: false,
            error:
              "Ye phone number pehle se kisi aur account me registered hai.",
          };
        }
      }

      if (isPasswordChanging && auth.currentUser) {
        if (password!.length < 6)
          return {
            success: false,
            error: "Password must be at least 6 characters long.",
          };
      }

      console.log("[LoginSettings] Firestore Write Started");
      const { writeBatch, doc, getDoc } = require("firebase/firestore");
      const batch = writeBatch(db);

      const publicRef = doc(db, "publicProfiles", user.uid);
      const privateRef = doc(db, "privateUsers", user.uid);

      const newTimestamp = new Date().toISOString();

      if (isUsernameChanging) {
        batch.set(
          publicRef,
          { username: cleanUsername, usernameLastChangedAt: newTimestamp },
          { merge: true }
        );
        batch.set(doc(db, "usernames", cleanUsername), { uid: user.uid });
        batch.set(doc(db, "emailLookup", cleanUsername), { email: user.email });
        if (user.username) {
          batch.delete(doc(db, "usernames", user.username.toLowerCase()));
          batch.delete(doc(db, "emailLookup", user.username.toLowerCase()));
        }
      }

      if (isPhoneChanging || isPasswordChanging) {
        const privateUpdates: any = {};
        if (isPhoneChanging) {
          privateUpdates.phone = cleanPhone;
          batch.set(doc(db, "emailLookup", cleanPhone), { email: user.email });
          if (user.phone) {
            batch.delete(doc(db, "emailLookup", user.phone));
          }
        }
        if (isPasswordChanging) {
          privateUpdates.hasPassword = true;
        }
        batch.set(privateRef, privateUpdates, { merge: true });
      }

      await batch.commit();
      console.log("[LoginSettings] Firestore Write Success");

      if (isPasswordChanging && auth.currentUser) {
        console.log("[LoginSettings] Auth Update Started");
        try {
          const hasPasswordProvider = auth.currentUser.providerData.some(
            (p: any) => p.providerId === "password"
          );
          if (hasPasswordProvider) {
            const { updatePassword } = require("firebase/auth");
            await updatePassword(auth.currentUser, password!);
          } else {
            const {
              EmailAuthProvider,
              linkWithCredential,
            } = require("firebase/auth");
            const credential = EmailAuthProvider.credential(
              auth.currentUser.email!,
              password!
            );
            await linkWithCredential(auth.currentUser, credential);
          }
          console.log("[LoginSettings] Auth Update Success");
        } catch (authError: any) {
          console.error(
            "[LoginSettings] Auth Update Failed. Triggering Rollback.",
            authError
          );
          console.log("[LoginSettings] Rollback Started");

          const rollbackBatch = writeBatch(db);

          if (isUsernameChanging) {
            // Need to handle fields being deleted or set to original
            const revertPublic: any = { username: user.username || null };
            if (!user.usernameLastChangedAt) {
              revertPublic.usernameLastChangedAt =
                require("firebase/firestore").deleteField();
            } else {
              revertPublic.usernameLastChangedAt = user.usernameLastChangedAt;
            }
            rollbackBatch.set(publicRef, revertPublic, { merge: true });

            if (user.username) {
              rollbackBatch.set(
                doc(db, "usernames", user.username.toLowerCase()),
                { uid: user.uid }
              );
              rollbackBatch.set(
                doc(db, "emailLookup", user.username.toLowerCase()),
                { email: user.email }
              );
            }
            rollbackBatch.delete(doc(db, "usernames", cleanUsername));
            rollbackBatch.delete(doc(db, "emailLookup", cleanUsername));
          }

          if (isPhoneChanging || isPasswordChanging) {
            const privateReverts: any = {};
            if (isPhoneChanging) {
              privateReverts.phone = user.phone || null;
              if (user.phone) {
                rollbackBatch.set(doc(db, "emailLookup", user.phone), {
                  email: user.email,
                });
              }
              rollbackBatch.delete(doc(db, "emailLookup", cleanPhone));
            }
            if (isPasswordChanging) {
              privateReverts.hasPassword = user.hasPassword || false;
            }
            rollbackBatch.set(privateRef, privateReverts, { merge: true });
          }

          await rollbackBatch.commit();
          console.log("[LoginSettings] Rollback Success");

          return {
            success: false,
            error:
              "Failed to update authentication. Changes were rolled back. " +
              (getReadableErrorMessage(authError) || authError.message),
          };
        }
      }

      console.log("[LoginSettings] State Refresh Started");
      const [publicSnap, privateSnap] = await Promise.all([
        getDoc(publicRef),
        getDoc(privateRef),
      ]);

      const freshData = {
        ...(publicSnap.data() || {}),
        ...(privateSnap.data() || {}),
      } as UserProfile;
      await setUser({ ...freshData, uid: user.uid });
      console.log("[LoginSettings] State Refresh Success");

      return { success: true };
    } catch (e: any) {
      console.error("[LoginSettings] Error during atomic save:", e);
      return { success: false, error: getReadableErrorMessage(e) || e.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      if (Platform.OS !== "web") {
        try {
          const {
            GoogleSignin,
          } = require("@react-native-google-signin/google-signin");
          await GoogleSignin.signOut();
        } catch (e) {
          console.warn("Google Sign-Out failed:", e);
        }
      }
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
    updateUsername,
    updatePrivacySettings,
    configurePassword,
    checkUsernameAvailability,
    validateUsername,
    saveLoginSettings,
    logout,
  };
}
