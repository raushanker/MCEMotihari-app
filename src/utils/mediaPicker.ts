import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, Linking } from 'react-native';

export interface MediaPickerResult {
  uri: string | null;
  base64?: string | null;
  error?: string | null;
  width?: number;
  height?: number;
}

/**
 * A robust helper for launching the media picker with comprehensive error handling,
 * granular logging for Android 12/13/14/15, and fallback UI alerts.
 */
export async function launchMediaPicker(
  options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images, // Safely use the enum
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  }
): Promise<MediaPickerResult> {
  try {
    if (Platform.OS === 'ios') {
      if (__DEV__) { console.log('[MediaPicker] Requesting media library permissions...'); }
      let permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
      let status = permissionResult.status;
      let canAskAgain = permissionResult.canAskAgain;

      if (status !== 'granted' && canAskAgain) {
        const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        status = requestResult.status;
      }

      if (status !== 'granted') {
        console.warn(`[MediaPicker] Permission denied. Status: ${status}`);
        Alert.alert(
          'Gallery Permission Required 📸',
          'MCE Connect ko attachments upload karne ke liye gallery permissions ki zarurat hai. Settings me jaakar permissions allow karein.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return { uri: null, error: 'Permission denied' };
      }
    }

    if (__DEV__) { console.log('[MediaPicker] Launching image library with options:', JSON.stringify({ ...options, base64: !!options.base64 })); }
    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) {
      if (__DEV__) { console.log('[MediaPicker] Asset selection canceled by user.'); }
      return { uri: null, error: 'No image selected' };
    }

    if (!result.assets || result.assets.length === 0) {
      console.warn('[MediaPicker] No assets found in result.');
      return { uri: null, error: 'Upload failed' };
    }

    const asset = result.assets[0];
    if (__DEV__) { console.log(`[MediaPicker] Asset selected successfully: ${asset.uri.substring(0, 50)}...`); }

    // Optionally check format if needed
    if (asset.uri && (asset.uri.endsWith('.gif') || asset.uri.endsWith('.webp'))) {
      if (__DEV__) { console.log('[MediaPicker] Warning: Selected format might not be supported universally.'); }
    }

    return {
      uri: asset.uri,
      base64: asset.base64,
      width: asset.width,
      height: asset.height,
    };
  } catch (error: any) {
    console.error('[MediaPicker] Failed to launch gallery:', error);
    Alert.alert(
      'Upload Error',
      'Something went wrong while opening the gallery. Please try again.',
      [{ text: 'OK' }]
    );
    return { uri: null, error: error.message || 'Unknown network error' };
  }
}
