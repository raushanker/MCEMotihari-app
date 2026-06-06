import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { WebView } from 'react-native-webview';
import * as ScreenCapture from 'expo-screen-capture';

interface PdfViewerModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  material?: any;
}

export function PdfViewerModal({ visible, onClose, url, title = 'Document Viewer', material }: PdfViewerModalProps) {
  const theme = useThemeColors();
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState(0); // Force re-render on reload/retry
  const [error, setError] = useState<string | null>(null);

  const savedMaterials = useAppStore(state => state.savedMaterials) || [];
  const toggleMaterialBookmark = useAppStore(state => state.toggleMaterialBookmark);

  // Format cleanUrl to resolve iframe embedding block for Google Drive / Cloudinary
  let cleanUrl = url;
  if (url && url.includes('cloudinary.com')) {
    if (url.includes('/q_auto/')) {
      cleanUrl = url.replace('/q_auto/', '/');
    }
    // Wrap direct PDF URL in Google Docs Viewer for Android WebView compatibility
    if (Platform.OS === 'android') {
      cleanUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`;
    }
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

  // Prevent screenshots/screen recordings when PDF viewer is open to protect data security
  useEffect(() => {
    if (visible) {
      ScreenCapture.preventScreenCaptureAsync().catch(err => {
        console.warn('[PDF Viewer] Screen capture prevention error:', err);
      });
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    }
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [visible]);

  // Run check on material status to see if it was deleted/rejected
  useEffect(() => {
    if (!visible) return;
    if (material && (material.status === 'DELETED' || material.status === 'REJECTED' || material.status === 'Deleted' || material.status === 'Rejected')) {
      setError("This study material is unavailable because it has been removed by the administrator. It is not related to study materials or violated our terms & conditions.");
      setIsLoading(false);
    } else {
      setError(null);
    }
  }, [visible, material]);

  // Handle reload/retry
  const handleReload = () => {
    setError(null);
    setIsLoading(true);
    setKey(prev => prev + 1);
  };

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

  // JavaScript to inject into WebView to hide download, print, popout buttons and disable copy-paste selection
  const injectedJS = `
    (function() {
      // Create style to hide UI elements and disable selection/interaction
      var style = document.createElement('style');
      style.innerHTML = \`
        /* Hide Google Drive/Docs Top Bar, download, print, popout buttons */
        .ndFisb, 
        .drive-viewer-chrome,
        .drive-viewer-chrome-shadow,
        [role="button"][aria-label*="Download"],
        [role="button"][aria-label*="download"],
        [role="button"][aria-label*="Print"],
        [role="button"][aria-label*="print"],
        [role="button"][aria-label*="Pop-out"],
        [role="button"][aria-label*="popout"],
        [role="button"][data-tooltip*="Download"],
        [role="button"][data-tooltip*="Print"],
        [role="button"][data-tooltip*="Pop-out"],
        .drive-viewer-popout-button,
        .drive-viewer-download-button,
        .drive-viewer-print-button,
        #drive-viewer-popout-button,
        #drive-viewer-download-button,
        #drive-viewer-print-button,
        .viewer-chrome,
        .viewer-chrome-shadow,
        #icon-download,
        #icon-print,
        #icon-popout,
        .icon-download,
        .icon-print,
        .icon-popout {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          pointer-events: none !important;
        }

        /* Disable user selection */
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      \`;
      document.head.appendChild(style);

      // Periodically clean up DOM elements just in case they render dynamically
      var hideElements = function() {
        var selectors = [
          '.ndFisb',
          '.drive-viewer-chrome',
          '.drive-viewer-chrome-shadow',
          '[role="button"][aria-label*="Download"]',
          '[role="button"][aria-label*="download"]',
          '[role="button"][aria-label*="Print"]',
          '[role="button"][aria-label*="print"]',
          '[role="button"][aria-label*="Pop-out"]',
          '[role="button"][aria-label*="popout"]',
          '[role="button"][data-tooltip*="Download"]',
          '[role="button"][data-tooltip*="Print"]',
          '[role="button"][data-tooltip*="Pop-out"]',
          '.drive-viewer-popout-button',
          '.drive-viewer-download-button',
          '.drive-viewer-print-button',
          '#drive-viewer-popout-button',
          '#drive-viewer-download-button',
          '#drive-viewer-print-button',
          '.viewer-chrome',
          '.viewer-chrome-shadow',
          '#icon-download',
          '#icon-print',
          '#icon-popout',
          '.icon-download',
          '.icon-print',
          '.icon-popout'
        ];
        selectors.forEach(function(sel) {
          var els = document.querySelectorAll(sel);
          els.forEach(function(el) {
            if (el) {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('opacity', '0', 'important');
              el.style.setProperty('pointer-events', 'none', 'important');
            }
          });
        });
      };
      
      setInterval(hideElements, 300);
      hideElements();
    })();
    true;
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
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
            >
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={20} 
                color={isBookmarked ? "#F97316" : theme.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReload} style={styles.refreshBtn} activeOpacity={0.7}>
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
            /* Native Webview (react-native-webview) */
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <WebView
                key={key}
                source={{ uri: cleanUrl.includes('drive.google.com') ? cleanUrl : `${cleanUrl}#toolbar=0` }}
                style={[
                  styles.webview, 
                  cleanUrl.includes('drive.google.com') && { marginTop: -56, marginBottom: -56 }
                ]}
                onLoadEnd={() => setIsLoading(false)}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('[PDF Viewer WebView Error]: ', nativeEvent);
                  setError(nativeEvent.description || "Failed to load PDF resource inside WebView.");
                  setIsLoading(false);
                }}
                injectedJavaScript={injectedJS}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            </View>
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
      </SafeAreaView>
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
  webview: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 56,
    backgroundColor: 'transparent',
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
