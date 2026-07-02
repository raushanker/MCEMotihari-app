import { Platform } from 'react-native';
import { showAppError } from '@/utils/errors/errorManager';
import * as ImageManipulator from 'expo-image-manipulator';
import { functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Uploads an image to Cloudinary using direct REST API (FormData).
 * Compresses the image to WebP on the client side to save bandwidth and upload time.
 * Enforces a strict 10MB limit on the compressed image.
 * 
 * @param imageUri The local file URI from expo-image-picker
 * @returns Promise with the optimized secure URL or null if failed
 */
export async function uploadToCloudinary(imageUri: string, signal?: AbortSignal): Promise<string | null> {
  if (!imageUri) return null;

  try {
    let finalUri = imageUri;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
    
    // 1. Client-Side Compression to WEBP
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // no resizing needed, just compression
        { compress: 0.95, format: ImageManipulator.SaveFormat.WEBP }
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
        showAppError('Image Too Large ❌', 'Image size 10MB se kam hona chahiye!');
        return null;
      }
      data.append('file', blob, fileName || 'upload.webp');
    } else {
      try {
        const FileSystem = require('expo-file-system/legacy');
        const fileInfo = await FileSystem.getInfoAsync(finalUri);
        if (fileInfo.exists && fileInfo.size && fileInfo.size > MAX_SIZE) {
          showAppError('Image Too Large ❌', 'Image size 10MB se kam hona chahiye!');
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
    
    // Fetch Signed Upload Signature from backend Cloud Function securely!
    const generateSignatureFn = httpsCallable(functions, 'generateCloudinarySignature');
    const signatureResult = await generateSignatureFn();
    const { signature, timestamp, api_key, cloud_name, upload_preset } = signatureResult.data as any;
    if (!signature || !timestamp || !api_key || !cloud_name || !upload_preset) {
      throw new Error('Cloudinary upload is not configured correctly.');
    }

    data.append('api_key', api_key);
    data.append('timestamp', String(timestamp));
    data.append('signature', signature);
    data.append('upload_preset', upload_preset);
    
    // 3. Upload to Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
      method: 'POST',
      body: data,
      headers: {
        'Accept': 'application/json',
      },
      signal,
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
    showAppError('Upload Error', error, 'Image upload karne me dikkat aayi.');
    return null;
  }
}

/**
 * Injects dynamic Cloudinary size and format optimization properties for delivery.
 * Reduces bandwidth usage and layout shift jank on client-side feeds.
 */
export function getOptimizedImageUrl(url: string, width: number = 600): string {
  if (!url) return '';
  if (url.includes('cloudinary.com') && url.includes('/image/upload/')) {
    // If requesting high width (like lightbox fullscreen), maximize quality
    const quality = width >= 1000 ? 'q_auto:best' : 'q_auto';
    const transformStr = `f_auto,${quality},w_${width},c_limit/`;
    if (url.includes('/f_webp,q_auto/')) {
      return url.replace('/f_webp,q_auto/', `/${transformStr}`);
    }
    return url.replace('/image/upload/', `/image/upload/${transformStr}`);
  }
  return url;
}
