import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
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
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied.');
      return null;
    }

    // 3. Get Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? '73b46297-5992-4e19-959b-770ba2b93f18';
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    
    if (token) {
      console.log('Retrieved Expo Push Token:', token);
      
      // 4. Update both publicProfiles and privateUsers
      const publicRef = doc(db, 'publicProfiles', userId);
      const privateRef = doc(db, 'privateUsers', userId);

      await Promise.all([
        updateDoc(publicRef, { pushToken: token }).catch(e => console.warn('Failed to save push token to public profile:', e)),
        updateDoc(privateRef, { pushToken: token }).catch(e => console.warn('Failed to save push token to private user:', e))
      ]);
      
      return token;
    }
  } catch (error) {
    console.warn('Failed to register and save push token:', error);
  }
  return null;
}

/**
 * Sends a push notification to multiple Expo push tokens in chunks of 100.
 */
export async function sendPushNotifications(tokens: string[], title: string, body: string, url: string = '/notifications', imageUrl?: string) {
  if (tokens.length === 0) return;

  // Filter unique non-empty tokens
  const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.startsWith('ExponentPushToken'))));
  if (uniqueTokens.length === 0) return;

  const chunkSize = 100;
  const chunks: string[][] = [];
  
  for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
    chunks.push(uniqueTokens.slice(i, i + chunkSize));
  }

  console.log(`Sending push alerts to ${uniqueTokens.length} devices in ${chunks.length} chunks...`);

  const promises = chunks.map(chunk => {
    const messages = chunk.map(token => {
      const msg: any = {
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: { url, imageUrl }
      };
      if (imageUrl) {
        msg.attachments = [{ url: imageUrl }];
        msg.mutableContent = true;
      }
      return msg;
    });

    return fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })
      .then(res => res.json())
      .then(data => {
        if (__DEV__) console.log('Expo Push Response:', JSON.stringify(data));
      })
      .catch(err => console.warn('Error sending expo push chunk:', err));
  });

  await Promise.all(promises);
}
