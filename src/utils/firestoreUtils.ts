export const sanitizeFirestoreData = (obj: any): any => {
  if (obj === undefined) {
    return null;
  }
  
  // Handle Date, null, or primitives
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj
      .map((item) => sanitizeFirestoreData(item))
      .filter((item) => item !== undefined && item !== null);
  }

  // Handle objects
  const cleanedObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Omit undefined completely
      if (value !== undefined) {
        const cleanedValue = sanitizeFirestoreData(value);
        if (cleanedValue !== undefined) {
          cleanedObj[key] = cleanedValue;
        }
      }
    }
  }
  
  return cleanedObj;
};

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/useAppStore';

export async function verifyPostExists(postId: string): Promise<boolean> {
  if (!postId) return false;
  
  // Prevent mock post check or static local posts
  if (postId.startsWith('post-')) {
    return true; 
  }

  try {
    const postDocRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postDocRef);
    
    if (postSnap.exists()) {
      return true;
    } else {
      // Log the missing post ID and reason.
      console.warn(`[Firestore Failure] Post ID: ${postId} was deleted, orphaned, or is no longer available in Firebase Cloud.`);
      
      // Automatically remove it from local cache/feed
      const store = useAppStore.getState();
      const filteredPosts = store.posts.filter(p => p.id !== postId);
      useAppStore.setState({ posts: filteredPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(filteredPosts));
      
      Alert.alert('Unavailable', 'Post not available or removed.');
      return false;
    }
  } catch (err: any) {
    console.error(`[Firestore Failure] Failed to verify post existence for post ID: ${postId}. Reason: ${err.message}`, err);
    // On permission error, rules lockdown, or network fail:
    if (err.message && err.message.includes('permission')) {
      console.warn(`[Firestore Failure] Post ID: ${postId} is inaccessible due to Security Rules Lockdown.`);
      
      const store = useAppStore.getState();
      const filteredPosts = store.posts.filter(p => p.id !== postId);
      useAppStore.setState({ posts: filteredPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(filteredPosts));
      
      Alert.alert('Unavailable', 'Post not available or removed.');
      return false;
    }
    return true; // Let them route and try anyway on simple network issues
  }
}

