import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Request notification permissions and register for push notifications.
 * Saves the resulting Expo Push Token to the user's public and private profile in Firestore.
 */
export async function registerAndSavePushToken(userId: string) {
  if (Platform.OS === 'web') return null;

  try {
    // 1. Android specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 2. Permissions check
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (userId === 'guest') {
      if (existingStatus !== 'granted') {
        console.log('Guest notification permission not granted. Skipping token registration.');
        return null;
      }
    } else {
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied.');
        return null;
      }
    }

    // 3. Get Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? '73b46297-5992-4e19-959b-770ba2b93f18';
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    
    if (token) {
      console.log('Retrieved Expo Push Token:', token);
      
      if (userId === 'guest') {
        // Create a stable guest ID based on the push token.
        // E.g., ExponentPushToken[xxx-yyy-zzz] -> guest_xxxyyyzzz
        const tokenHash = token.replace(/[^a-zA-Z0-9]/g, '');
        const guestId = `guest_${tokenHash}`;
        
        const publicRef = doc(db, 'publicProfiles', guestId);
        await setDoc(publicRef, { 
          pushToken: token, 
          role: 'Guest', 
          isGuest: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(e => console.warn('Failed to save guest push token to public profile:', e));
        
        return token;
      } else {
        // 4. Save token to users/{uid} as requested
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { 
          expoPushToken: token, 
          notificationsEnabled: true, 
          updatedAt: new Date().toISOString() 
        }, { merge: true }).catch(e => console.warn('Failed to save push token to users collection:', e));

        // Also update publicProfiles as a fallback for backward compatibility
        const publicRef = doc(db, 'publicProfiles', userId);
        await setDoc(publicRef, { pushToken: token }, { merge: true }).catch(e => console.warn('Failed to save push token to public profile:', e));
        
        return token;
      }
    }
  } catch (error) {
    console.warn('Failed to register and save push token:', error);
  }
  return null;
}

/**
 * Sends a push notification to multiple Expo push tokens in chunks of 100.
 * Returns delivery statistics and any invalid tokens that should be removed.
 */
export async function sendPushNotifications(tokens: string[], title: string, body: string, url: string = '/notifications', imageUrl?: string) {
  if (tokens.length === 0) return { successCount: 0, failedCount: 0, invalidTokens: [] };

  // Filter unique non-empty tokens
  const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.startsWith('ExponentPushToken'))));
  if (uniqueTokens.length === 0) return { successCount: 0, failedCount: 0, invalidTokens: [] };

  const chunkSize = 100;
  const chunks: string[][] = [];
  
  for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
    chunks.push(uniqueTokens.slice(i, i + chunkSize));
  }

  console.log(`Sending push alerts to ${uniqueTokens.length} devices in ${chunks.length} chunks...`);

  let successCount = 0;
  let failedCount = 0;
  let invalidTokens: string[] = [];

  const promises = chunks.map(async (chunk) => {
    const messages = chunk.map(token => {
      const msg: any = {
        to: token,
        sound: 'default',
        title: title,
        body: body,
        priority: 'high',
        channelId: 'default',
        data: { url, imageUrl }
      };
      if (imageUrl) {
        msg.attachments = [{ url: imageUrl }];
        msg.mutableContent = true;
      }
      return msg;
    });

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      
      const data = await response.json();
      
      if (data && data.data && Array.isArray(data.data)) {
        data.data.forEach((receipt: any, index: number) => {
          if (receipt.status === 'ok') {
            successCount++;
          } else {
            failedCount++;
            if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
              invalidTokens.push(chunk[index]);
            }
          }
        });
      }
    } catch (err) {
      console.warn('Error sending expo push chunk:', err);
      failedCount += chunk.length;
    }
  });

  await Promise.all(promises);
  return { successCount, failedCount, invalidTokens };
}
