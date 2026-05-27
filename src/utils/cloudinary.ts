import { Alert, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const CLOUDINARY_CLOUD_NAME = (process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dcwz06wob').replace(/['"]/g, ''); 
const CLOUDINARY_UPLOAD_PRESET = (process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'mce_connect_preset').replace(/['"]/g, '');

/**
 * Uploads an image to Cloudinary using direct REST API (FormData).
 * Compresses the image to WebP on the client side to save bandwidth and upload time.
 * Enforces a strict 10MB limit on the compressed image.
 * 
 * @param imageUri The local file URI from expo-image-picker
 * @returns Promise with the optimized secure URL or null if failed
 */
export async function uploadToCloudinary(imageUri: string): Promise<string | null> {
  if (!imageUri) return null;

  try {
    let finalUri = imageUri;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
    
    // 1. Client-Side Compression to WEBP
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // no resizing needed, just compression
        { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
      );
      finalUri = manipResult.uri;
    } catch (err) {
      console.warn('Image manipulation failed, falling back to original:', err);
    }

    const data = new FormData();
    
    // Get file name and type
    const uriParts = finalUri.split('/');
    let fileName = uriParts[uriParts.length - 1];
    
    // Change extension to webp if manipulated successfully
    if (finalUri.endsWith('.webp') || !fileName.includes('.')) {
      fileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
    }

    // 2. Size Validation and FormData formatting
    if (Platform.OS === 'web') {
      const response = await fetch(finalUri);
      const blob = await response.blob();
      if (blob.size > MAX_SIZE) {
        Alert.alert('Image Too Large ❌', 'Image size 10MB se kam hona chahiye!');
        return null;
      }
      data.append('file', blob, fileName || 'upload.webp');
    } else {
      try {
        const FileSystem = require('expo-file-system');
        const fileInfo = await FileSystem.getInfoAsync(finalUri);
        if (fileInfo.exists && fileInfo.size && fileInfo.size > MAX_SIZE) {
          Alert.alert('Image Too Large ❌', 'Image size 10MB se kam hona chahiye!');
          return null;
        }
      } catch (err) {
        console.warn('Failed to verify local image file size:', err);
      }
      
      data.append('file', {
        uri: finalUri,
        name: fileName || `upload.webp`,
        type: `image/webp`,
      } as any);
    }
    
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    // 3. Upload to Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: data,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary upload error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
    }

    const result = await response.json();
    
    // Cloudinary returns secure_url.
    // Inject Cloudinary's dynamic WebP and compression parameters for delivery: f_webp, q_auto
    let secureUrl = result.secure_url;
    if (secureUrl && secureUrl.includes('/image/upload/')) {
      secureUrl = secureUrl.replace('/image/upload/', '/image/upload/f_webp,q_auto/');
    }
    
    return secureUrl;
  } catch (error: any) {
    console.error('uploadToCloudinary failed:', error);
    Alert.alert('Upload Error', error.message || 'Image upload karne me dikkat aayi.');
    return null;
  }
}
