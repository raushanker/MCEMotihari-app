import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedProfile {
  data: any;
  fetchedAt: number;
}

const CACHE_PREFIX = '@mce_profile_cache_';
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetch cached user profile from AsyncStorage if it is not expired.
 */
export async function getCachedProfile(uid: string): Promise<any | null> {
  try {
    const cachedString = await Promise.race([
      AsyncStorage.getItem(`${CACHE_PREFIX}${uid}`),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
    ]);
    
    if (!cachedString) return null;

    const cached: CachedProfile = JSON.parse(cachedString);
    const age = Date.now() - cached.fetchedAt;

    if (age < CACHE_EXPIRATION) {
      console.log(`[Cache Manager] Cache HIT for uid: ${uid}. Age: ${Math.round(age / 1000 / 60)} mins.`);
      return cached.data;
    }
    
    console.log(`[Cache Manager] Cache EXPIRED for uid: ${uid}.`);
    return null;
  } catch (err) {
    console.warn(`[Cache Manager] Failed to read profile cache for uid: ${uid}`, err);
    return null;
  }
}

/**
 * Save user profile to AsyncStorage with current timestamp.
 */
export async function setCachedProfile(uid: string, data: any): Promise<void> {
  try {
    const cached: CachedProfile = {
      data,
      fetchedAt: Date.now(),
    };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${uid}`, JSON.stringify(cached));
    console.log(`[Cache Manager] Cache SAVED for uid: ${uid}.`);
  } catch (err) {
    console.warn(`[Cache Manager] Failed to write profile cache for uid: ${uid}`, err);
  }
}

/**
 * Delete a profile cache entry to force refresh.
 */
export async function invalidateProfileCache(uid: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${uid}`);
    console.log(`[Cache Manager] Cache INVALIDATED for uid: ${uid}.`);
  } catch (err) {
    console.warn(`[Cache Manager] Failed to invalidate profile cache for uid: ${uid}`, err);
  }
}
