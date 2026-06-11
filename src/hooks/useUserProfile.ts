import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

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
  const [profile, setProfile] = useState<UserProfileFallback>(() => {
    // Initialize with cached profile if available, otherwise use fallback
    if (uid && profileCache[uid]) {
      return { ...fallback, ...profileCache[uid] };
    }
    return fallback;
  });

  useEffect(() => {
    let isMounted = true;

    if (!uid) {
      setProfile(fallback);
      return;
    }

    if (profileCache[uid]) {
      setProfile({ ...fallback, ...profileCache[uid] });
      return;
    }

    const loadProfile = async () => {
      const fetchedProfile = await fetchProfile(uid);
      if (isMounted && fetchedProfile) {
        setProfile({ ...fallback, ...fetchedProfile });
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [uid, fallback.name, fallback.photoUrl, fallback.role]); // Listen to fallback changes in case of edits

  return profile;
}
