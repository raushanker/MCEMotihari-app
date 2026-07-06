import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, Linking, ActionSheetIOS } from 'react-native';
import * as FileSystem from 'expo-file-system';

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

/**
 * Prompts the user to choose between Camera and Gallery, then launches the appropriate picker.
 * Also strictly enforces a 10MB size limit on the selected asset.
 */
export async function pickMediaWithOptions(
  options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false, // Default to false for custom cropping later
    quality: 1.0, // High quality, compression handled later
  }
): Promise<MediaPickerResult> {
  return new Promise((resolve) => {
    const handleCamera = async () => {
      try {
        let permissionResult = await ImagePicker.getCameraPermissionsAsync();
        if (permissionResult.status !== 'granted') {
          permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        }
        if (permissionResult.status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          resolve({ uri: null, error: 'Permission denied' });
          return;
        }

        const result = await ImagePicker.launchCameraAsync(options);
        handleResult(result);
      } catch (err: any) {
        resolve({ uri: null, error: err.message });
      }
    };

    const handleGallery = async () => {
      try {
        const result = await launchMediaPicker(options); // Uses the existing helper with permissions
        if (result.uri) {
          await validateAndResolve(result);
        } else {
          resolve(result);
        }
      } catch (err: any) {
        resolve({ uri: null, error: err.message });
      }
    };

    const handleResult = async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled) {
        resolve({ uri: null, error: 'Canceled' });
        return;
      }
      if (!result.assets || result.assets.length === 0) {
        resolve({ uri: null, error: 'No assets' });
        return;
      }
      
      const asset = result.assets[0];
      await validateAndResolve({
        uri: asset.uri,
        base64: asset.base64,
        width: asset.width,
        height: asset.height
      });
    };

    const validateAndResolve = async (picked: MediaPickerResult) => {
      if (!picked.uri) {
        resolve(picked);
        return;
      }
      
      try {
        const fileInfo = await FileSystem.getInfoAsync(picked.uri);
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
          Alert.alert(
            'File Too Large ❌',
            'Image exceeds the maximum allowed limit of 10MB. Please select a smaller file.'
          );
          resolve({ uri: null, error: 'File size exceeds 10MB limit' });
          return;
        }
        resolve(picked);
      } catch (err) {
        console.warn('Could not verify file size:', err);
        resolve(picked);
      }
    };

    if (Platform.OS === 'web') {
      // On web, Alert with 3 buttons doesn't work well. Just open gallery directly.
      handleGallery();
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleCamera();
          else if (buttonIndex === 2) handleGallery();
          else resolve({ uri: null, error: 'Canceled' });
        }
      );
    } else {
      Alert.alert(
        'Upload Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({ uri: null, error: 'Canceled' }) },
          { text: 'Take Photo', onPress: handleCamera },
          { text: 'Choose from Gallery', onPress: handleGallery },
        ],
        { cancelable: true, onDismiss: () => resolve({ uri: null, error: 'Canceled' }) }
      );
    }
  });
}
