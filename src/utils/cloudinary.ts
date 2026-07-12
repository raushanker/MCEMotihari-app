import { Platform } from 'react-native';
import { showAppError } from '@/utils/errors/errorManager';
import * as ImageManipulator from 'expo-image-manipulator';
import { functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';

/**
 * Uploads an image to Cloudinary using direct REST API (FormData).
 * Compresses the image to WebP on the client side to save bandwidth and upload time.
 * Enforces a strict 10MB limit on the compressed image.
 * 
 * @param imageUri The local file URI from expo-image-picker
 * @returns Promise with the optimized secure URL or null if failed
 */
export async function uploadToCloudinary(imageUri: string, compressionMode: 'high' | 'low' = 'low', signal?: AbortSignal): Promise<string | null> {
  if (!imageUri) return null;

  try {
    let finalUri = imageUri;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
    
    // 1. Client-Side Compression to WEBP
    try {
      const targetWidth = compressionMode === 'high' ? 1080 : 1920;
      const quality = compressionMode === 'high' ? 0.6 : 0.9;
      
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: targetWidth } }], 
        { compress: quality, format: ImageManipulator.SaveFormat.WEBP }
      );
      finalUri = manipResult.uri;
    } catch (err) {
      console.warn('Image manipulation failed, falling back to original:', err);
    }

    // Get file name and type
    const uriParts = finalUri.split('/');
    let fileName = uriParts[uriParts.length - 1];
    if (finalUri.endsWith('.webp') || !fileName.includes('.')) {
      fileName = fileName.replace(/\\.[^/.]+$/, "") + ".webp";
    }

    // Fetch Signed Upload Signature from backend Cloud Function securely!
    const generateSignatureFn = httpsCallable(functions, 'generateCloudinarySignature');
    const signatureResult = await generateSignatureFn();
    const { signature, timestamp, api_key, cloud_name, upload_preset } = signatureResult.data as any;
    if (!signature || !timestamp || !api_key || !cloud_name || !upload_preset) {
      throw new Error('Cloudinary upload is not configured correctly.');
    }

    let result: any;

    if (Platform.OS === 'web') {
      const response = await fetch(finalUri);
      const blob = await response.blob();
      if (blob.size > MAX_SIZE) {
        showAppError('Image Too Large ❌', 'Image size 10MB se kam hona chahiye!');
        return null;
      }
      
      const data = new FormData();
      data.append('file', blob, fileName || 'upload.webp');
      data.append('api_key', api_key);
      data.append('timestamp', String(timestamp));
      data.append('signature', signature);
      data.append('upload_preset', upload_preset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' },
        signal,
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Cloudinary upload error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
      }
      result = await res.json();
    } else {
      try {
        const fileInfo = await FileSystem.getInfoAsync(finalUri);
        if (fileInfo.exists && fileInfo.size && fileInfo.size > MAX_SIZE) {
          showAppError('Image Too Large ❌', 'Image size 10MB se kam hona chahiye!');
          return null;
        }
      } catch (err) {
        console.warn('Failed to verify local image file size:', err);
      }

      const data = new FormData();
      data.append('file', {
        uri: Platform.OS === 'android' && !finalUri.startsWith('file://') ? `file://${finalUri}` : finalUri,
        type: finalUri.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
        name: fileName || 'upload.webp',
      } as any);
      data.append('api_key', api_key);
      data.append('timestamp', String(timestamp));
      data.append('signature', signature);
      data.append('upload_preset', upload_preset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' },
        signal,
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Cloudinary upload error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
      }
      result = await res.json();
    }
    
    // Cloudinary returns secure_url.
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
