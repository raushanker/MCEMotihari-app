/**
 * Validates a submitted URL for Study Materials.
 * Ensures it strictly follows https, is not a known folder format, and doesn't end with unsupported extensions.
 */
export function validateStudyMaterialUrl(url: string): { isValid: boolean; error?: string } {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return { isValid: false, error: 'URL is required.' };
  }

  // 1. Strictly HTTPS check
  if (!/^https:\/\//i.test(trimmedUrl)) {
    return { isValid: false, error: 'Link must start with https://' };
  }

  try {
    const parsedUrl = new URL(trimmedUrl);

    // 2. Reject folder structures (e.g. Google Drive folders, Dropbox folders)
    const folderPatterns = [
      /\/drive\/folders\//i,
      /\/drive\/u\/\d+\/folders\//i,
      /dropbox\.com\/sh\//i,
      /onedrive\.live\.com\/\?id=/i
    ];

    for (const pattern of folderPatterns) {
      if (pattern.test(trimmedUrl)) {
        return { isValid: false, error: 'Folder links are not allowed. Please provide a direct file link.' };
      }
    }

    // 3. Reject unsupported executable/media extensions
    const unsupportedExtensions = ['.exe', '.zip', '.rar', '.mp4', '.mkv', '.dmg', '.apk'];
    const pathname = parsedUrl.pathname.toLowerCase();
    
    for (const ext of unsupportedExtensions) {
      if (pathname.endsWith(ext)) {
        return { isValid: false, error: `${ext.toUpperCase()} files are not allowed. Please submit PDF links.` };
      }
    }

    return { isValid: true };
  } catch (e) {
    return { isValid: false, error: 'Invalid URL format.' };
  }
}
