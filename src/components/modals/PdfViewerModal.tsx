import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform, 
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PdfViewerModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  material?: any;
}

export function PdfViewerModal({ visible, onClose, url, title = 'Document Viewer', material }: PdfViewerModalProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState(0); // Force re-render on reload/retry
  const [error, setError] = useState<string | null>(null);
  const [finalSrc, setFinalSrc] = useState<string>('');

  const savedMaterials = useAppStore(state => state.savedMaterials) || [];
  const toggleMaterialBookmark = useAppStore(state => state.toggleMaterialBookmark);

  let cleanUrl = url;
  if (url && (url.includes('cloudinary.com') || url.includes('firebasestorage.googleapis.com') || (!url.includes('drive.google.com') && !url.startsWith('data:')))) {
    if (url.includes('/q_auto/')) {
      cleanUrl = url.replace('/q_auto/', '/');
    }
    // Safari and some mobile browsers have issues rendering direct PDFs in iframes, 
    // and some servers force download. Wrap it in Google Docs Viewer for reliable inline rendering.
    cleanUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`;
  } else if (url && url.includes('drive.google.com')) {
    let fileId = '';
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch && idMatch[1]) {
      fileId = idMatch[1];
    } else {
      const dMatch = url.match(/\/file\/d\/([^\/]+)/);
      if (dMatch && dMatch[1]) {
        fileId = dMatch[1];
      }
    }
    if (fileId) {
      if (fileId === '1aQ5LSOFGNCc-guR-7d_NVuqP-CH9_9uQ') {
        // Fallback to a real public PDF preview for testing mock uploads
        cleanUrl = 'https://docs.google.com/viewer?url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf&embedded=true';
      } else {
        cleanUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
  }

  // Run background checks when url or key changes
  useEffect(() => {
    if (!visible || !cleanUrl) return;

    setIsLoading(true);
    setError(null);

    // Check if material is deleted or rejected by an admin
    if (material && (material.status === 'DELETED' || material.status === 'REJECTED' || material.status === 'Deleted' || material.status === 'Rejected')) {
      setError("This study material is unavailable because it has been removed by the administrator.");
      setIsLoading(false);
      return;
    }

    if (cleanUrl.startsWith('data:')) {
      // Convert data URI to Blob URL manually to bypass fetch() size limits on long base64 strings
      try {
        const parts = cleanUrl.split(',');
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const blobUrl = URL.createObjectURL(blob);
        setFinalSrc(blobUrl);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to process local PDF data. The file might be corrupted or too large.");
        setIsLoading(false);
      }
    } else {
      // Pass through directly to iframe
      setFinalSrc(cleanUrl.includes('drive.google.com') ? cleanUrl : `${cleanUrl}#toolbar=0`);
      setIsLoading(false);
    }
  }, [cleanUrl, visible, key, material]);

  if (!url) return null;

  // Construct a standardized bookmark object if a custom one isn't passed
  const virtualMaterial = material || {
    id: url,
    title: title,
    fileUrl: url,
    subject: 'General',
    branch: 'General',
    semester: 'All',
    materialType: 'PDF',
    isLink: false,
    createdAt: new Date().toISOString()
  };

  const isBookmarked = savedMaterials.some((m: any) => m.id === virtualMaterial.id || m.fileUrl === url);

  const handleToggleBookmark = () => {
    toggleMaterialBookmark(virtualMaterial);
    const newState = !isBookmarked;
    useAppStore.getState().showToast(
      newState ? 'Saved to Notepad Hub! 📁' : 'Removed from Saved Hub', 
      'success'
    );
  };

  const handleReload = () => {
    setError(null);
    setIsLoading(true);
    setKey(prev => prev + 1);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[
          styles.header, 
          { 
            backgroundColor: theme.backgroundElement, 
            borderBottomColor: theme.cardBorder,
            paddingTop: insets.top + 8,
            height: 56 + insets.top,
            zIndex: 10,
            elevation: 10,
          }
        ]}>
          <TouchableOpacity 
            onPress={onClose} 
            style={[styles.backBtn, { zIndex: 9999 }]} 
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          
          <View style={styles.headerRightActions}>
            <TouchableOpacity 
              onPress={handleToggleBookmark} 
              style={styles.bookmarkBtn} 
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={20} 
                color={isBookmarked ? "#F97316" : theme.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleReload} 
              style={styles.refreshBtn} 
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="refresh" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PDF Reader Body */}
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          {error ? (
            /* Error State */
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
              <Text style={[styles.errorTitle, { color: theme.text }]}>
                {error.includes("removed") ? "Document Unavailable" : "Failed to load PDF"}
              </Text>
              <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>
                {error}
              </Text>
              {!error.includes("removed") && (
                <TouchableOpacity 
                  style={[styles.retryBtn, { backgroundColor: '#F97316' }]} 
                  onPress={handleReload}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>Retry Loading</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <div 
              style={{ width: '100%', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {finalSrc ? (
                <iframe
                  key={key}
                  src={finalSrc}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: 'none' 
                  }}
                  title={title}
                  onLoad={() => {
                    console.log(`[PDF Viewer Debug] Web Iframe Loaded successfully.`);
                    setIsLoading(false);
                  }}
                  onError={(err) => {
                    console.error(`[PDF Viewer Debug] Web Iframe error:`, err);
                    setError("Iframe failed to load PDF resource.");
                    setIsLoading(false);
                  }}
                />
              ) : null}
              {/* Security Badge overlay to hide Google's pop-out button on web */}
              <View 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  right: 0, 
                  width: 65, 
                  height: 65, 
                  backgroundColor: theme.cardBorder,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderBottomLeftRadius: 16,
                  zIndex: 1000,
                  opacity: 0.95
                }} 
              >
                <Ionicons name="shield-checkmark" size={22} color="#10B981" />
                <Text style={{ fontSize: 9, color: theme.text, marginTop: 2, fontWeight: '800' }}>SECURE</Text>
              </View>
            </div>
          )}

          {/* Spinner Overlay */}
          {isLoading && !error && (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Securing document connection...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    height: 56,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  refreshBtn: {
    padding: 6,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openTabBtn: {
    padding: 6,
  },
  bookmarkBtn: {
    padding: 6,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  content: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12.5,
    fontWeight: '700',
  },
  errorContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PdfViewerModal;
