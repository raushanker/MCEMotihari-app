const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'utils', 'mediaPicker.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add FileSystem and ActionSheetIOS imports
if (!content.includes("import * as FileSystem from 'expo-file-system';")) {
  content = content.replace(
    "import { Alert, Platform, Linking } from 'react-native';",
    "import { Alert, Platform, Linking, ActionSheetIOS } from 'react-native';\nimport * as FileSystem from 'expo-file-system';"
  );
}

// 2. Add pickMediaWithOptions function at the bottom
if (!content.includes("export async function pickMediaWithOptions")) {
  const newFunc = `
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
`;
  content += newFunc;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched mediaPicker.ts');
