import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

export interface UserProfileFallback {
  name: string;
  role: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | string;
  photoUrl?: string;
  department?: string;
  batch?: string;
}

// In-memory cache to store fetched user profiles.
const profileCache: Record<string, UserProfileFallback> = {};

// Deduplication queue for pending fetches.
const pendingFetches: Record<string, Promise<UserProfileFallback | null>> = {};

const fetchProfile = async (uid: string): Promise<UserProfileFallback | null> => {
  if (profileCache[uid]) {
    return profileCache[uid];
  }

  if (pendingFetches[uid] !== undefined) {
    return pendingFetches[uid];
  }

  const fetchPromise = (async () => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profile: UserProfileFallback = {
          name: data.name || data.displayName || 'Unknown',
          role: data.role || 'Student',
          photoUrl: data.photoUrl || data.photo || null,
          department: data.department || '',
          batch: data.batch || '',
        };
        profileCache[uid] = profile;
        return profile;
      }
    } catch (error) {
      console.warn(`Failed to fetch profile for uid: ${uid}`, error);
    } finally {
      delete pendingFetches[uid];
    }
    return null;
  })();

  pendingFetches[uid] = fetchPromise;
  return fetchPromise;
};

export function useUserProfile(uid: string | undefined, fallback: UserProfileFallback): UserProfileFallback {
  // Use a ref to stabilize the fallback reference across renders
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const [profile, setProfile] = useState<UserProfileFallback>(() => {
    if (uid && profileCache[uid]) {
      return { ...fallback, ...profileCache[uid] };
    }
    return fallback;
  });

  useEffect(() => {
    let isMounted = true;
    const currentFallback = fallbackRef.current;

    if (!uid) {
      setProfile(currentFallback);
      return;
    }

    if (profileCache[uid]) {
      setProfile({ ...currentFallback, ...profileCache[uid] });
      return;
    }

    const loadProfile = async () => {
      const fetchedProfile = await fetchProfile(uid);
      if (isMounted && fetchedProfile) {
        setProfile({ ...currentFallback, ...fetchedProfile });
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [uid]); // Only depend on uid to prevent infinite re-render loops

  return profile;
}
