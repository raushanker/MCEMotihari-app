import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform, 
  BackHandler,
  SafeAreaView,
  Share,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as WebBrowser from 'expo-web-browser';
import * as ScreenCapture from 'expo-screen-capture';
import * as Sharing from 'expo-sharing';
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
  const [htmlSource, setHtmlSource] = useState<string>('');

  const savedMaterials = useAppStore(state => state.savedMaterials) || [];
  const toggleMaterialBookmark = useAppStore(state => state.toggleMaterialBookmark);

  let cleanUrl = url;
  const isLocalFile = url && (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('/'));

  if (url && !isLocalFile && (url.includes('cloudinary.com') || url.includes('firebasestorage.googleapis.com') || (!url.includes('drive.google.com') && !url.startsWith('data:')))) {
    if (url.includes('/q_auto/')) {
      cleanUrl = url.replace('/q_auto/', '/');
    }
    // Safari and some mobile browsers have issues rendering direct PDFs in iframes, 
    // and some servers force download. Wrap it in Google Docs Viewer for reliable inline rendering.
    cleanUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`;
  } else if (url && !isLocalFile && url.includes('drive.google.com')) {
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

  // JavaScript to inject into WebView to hide download, print, popout buttons and disable copy-paste selection
  const injectedJS = `
    (function() {
      var style = document.createElement('style');
      style.innerHTML = \`
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
      \`;
      document.head.appendChild(style);
      
      // Disable right click and selection
      document.oncontextmenu = function() { return false; };
      document.onselectstart = function() { return false; };
    })();
    true;
  `;

  // Prevent screenshots/screen recordings when PDF viewer is open to protect data security
  useEffect(() => {
    if (Platform.OS === 'web') return;
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

  // Handle Android hardware back button while modal is visible
  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [visible]);

  // Run background checks when url or key changes
  useEffect(() => {
    if (!visible || !cleanUrl) return;

    setIsLoading(true);
    setError(null);
    setHtmlSource('');
    setFinalSrc('');

    // Check if material is deleted or rejected by an admin
    if (material && (material.status === 'DELETED' || material.status === 'REJECTED' || material.status === 'Deleted' || material.status === 'Rejected')) {
      setError("This study material is unavailable because it has been removed by the administrator.");
      setIsLoading(false);
      return;
    }

    const processLocalPdf = async () => {
      if (Platform.OS === 'web' && cleanUrl.startsWith('data:')) {
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
        return;
      }

      if (Platform.OS === 'android' && (cleanUrl.startsWith('data:') || cleanUrl.startsWith('file://') || cleanUrl.startsWith('/'))) {
        try {
          let base64Data = '';
          if (cleanUrl.startsWith('data:')) {
            base64Data = cleanUrl.includes(',') ? cleanUrl.split(',')[1] : cleanUrl;
          } else {
            let actualUri = cleanUrl;
            if (cleanUrl.startsWith('/')) actualUri = `file://${cleanUrl}`;
            base64Data = await FileSystem.readAsStringAsync(actualUri, {
              encoding: 'base64',
            });
          }

          const pdfJsHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes" />
              <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
              <style>
                body { margin: 0; padding: 0; background-color: #e5e7eb; display: flex; flex-direction: column; align-items: center; }
                canvas { max-width: 100%; height: auto; margin-bottom: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                #loading { margin-top: 50px; font-family: sans-serif; font-weight: bold; color: #6b7280; }
              </style>
            </head>
            <body>
              <div id="loading">Loading PDF...</div>
              <div id="pdf-container"></div>
              <script>
                async function loadPdf() {
                  try {
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage("Status: Starting PDF load");
                    const base64Data = "${base64Data}";
                    
                    // Fast conversion using native fetch
                    const dataUri = "data:application/pdf;base64," + base64Data;
                    const response = await fetch(dataUri);
                    const arrayBuffer = await response.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage("Status: Converted to Uint8Array. Size: " + uint8Array.length);
                    
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                    
                    const pdf = await pdfjsLib.getDocument({data: uint8Array}).promise;
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage("Status: PDF Document loaded. Pages: " + pdf.numPages);
                    
                    document.getElementById('loading').style.display = 'none';
                    const container = document.getElementById('pdf-container');
                    
                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                      const page = await pdf.getPage(pageNum);
                      const viewport = page.getViewport({scale: 1.5});
                      const canvas = document.createElement('canvas');
                      const context = canvas.getContext('2d');
                      canvas.height = viewport.height;
                      canvas.width = viewport.width;
                      container.appendChild(canvas);
                      
                      await page.render({
                        canvasContext: context,
                        viewport: viewport
                      }).promise;
                      window.ReactNativeWebView && window.ReactNativeWebView.postMessage("Status: Rendered page " + pageNum);
                    }
                  } catch(err) {
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage("Error: " + err.message);
                    document.getElementById('loading').innerText = "Failed to load PDF: " + err.message;
                  }
                }
                
                loadPdf();
              </script>
            </body>
            </html>
          `;
          
          const fileUri = FileSystem.cacheDirectory + 'local_pdf_viewer_' + Date.now() + '.html';
          await FileSystem.writeAsStringAsync(fileUri, pdfJsHtml, { encoding: 'utf8' });
          setHtmlSource(fileUri);
          setIsLoading(false);
        } catch (e) {
          console.error("FS Error loading local PDF:", e);
          setError("Failed to load local PDF document.");
          setIsLoading(false);
        }
        return;
      }

      // Pass through directly to iframe or WebView for remote URLs
      setFinalSrc(cleanUrl.includes('drive.google.com') ? cleanUrl : `${cleanUrl}#toolbar=0`);
      setIsLoading(false);
    };

    processLocalPdf();
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
    forceBlurActiveElement();
  };

  const handleReload = () => {
    setError(null);
    setIsLoading(true);
    setKey(prev => prev + 1);
    forceBlurActiveElement();
  };

  const handleClose = () => {
    if (Platform.OS === 'web') {
      const confirmClose = window.confirm("Are you sure you want to close this PDF and go back?");
      if (confirmClose) {
        forceBlurActiveElement();
        onClose();
      }
    } else {
      Alert.alert(
        "Close Document",
        "Are you sure you want to close this PDF and go back?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Close", 
            style: "destructive",
            onPress: () => {
              forceBlurActiveElement();
              onClose();
            }
          }
        ]
      );
    }
  };

  const forceBlurActiveElement = () => {
    if (Platform.OS === 'web') {
      try {
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
      } catch (e) {
        console.warn('Error blurring active element:', e);
      }
    }
  };

  const handleShare = async () => {
    try {
      const appLink = 'https://play.google.com/store/apps/details?id=mcemotihari.app';
      let detailsText = 'ℹ️ About: Important Document';
      
      if (material) {
        detailsText = `📌 Subject: ${material.subject || 'General'}\n📚 Branch: ${material.branch || 'All'}\n🗓 Semester: ${material.semester || 'All'}`;
      }

      const shareMessage = `📄 Document: ${title || 'Document'}\n${detailsText}\n\nShared via MCE Motihari App:\n${appLink}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: title || 'Document',
            text: shareMessage,
          });
        }
      } else {
        if (isLocalFile) {
          let shareUri = url;
          if (shareUri.startsWith('/')) {
            shareUri = `file://${shareUri}`;
          }
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(shareUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
          }
        } else {
          await Share.share({
            message: shareMessage,
            title: title || 'Document'
          });
        }
      }
    } catch (error) {
      console.warn('Error sharing:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
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
            zIndex: 99999,
            elevation: 99999,
            position: 'relative',
          }
        ]}>
          <TouchableOpacity 
            onPress={handleClose} 
            style={[styles.backBtn, { zIndex: 99999 }]} 
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
          ) : Platform.OS === 'web' ? (
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

            </div>
          ) : (
            <View style={{ flex: 1, width: '100%' }}>
              {(finalSrc || htmlSource) ? (
                <WebView
                  key={key}
                  source={htmlSource ? { uri: htmlSource } : { uri: finalSrc }}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
                  onLoadEnd={() => setIsLoading(false)}
                  onError={(syntheticEvent) => {
                    console.warn('WebView error: ', syntheticEvent.nativeEvent);
                    setError("Failed to load PDF resource.");
                    setIsLoading(false);
                  }}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
                      <ActivityIndicator size="large" color="#F97316" />
                      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                        Loading document...
                      </Text>
                    </View>
                  )}
                  originWhitelist={['*']}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  scalesPageToFit={true}
                  mixedContentMode="always"
                  allowFileAccess={true}
                  allowFileAccessFromFileURLs={true}
                  allowUniversalAccessFromFileURLs={true}
                  injectedJavaScript={injectedJS}
                  onMessage={(event) => {
                    console.log('[WebView Msg]:', event.nativeEvent.data);
                  }}
                />
              ) : null}
            </View>
          )}

          {/* Share Button overlay to hide Google's pop-out button on BOTH web and native */}
          {(Platform.OS === 'web' || finalSrc || htmlSource) && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleShare}
              style={{ 
                position: 'absolute', 
                top: 0, 
                right: 0, 
                width: 65, 
                height: 65, 
                backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                justifyContent: 'center',
                alignItems: 'center',
                borderBottomLeftRadius: 16,
                zIndex: 1000,
                opacity: 0.98,
                borderLeftWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.isDark ? '#334155' : '#E2E8F0'
              }} 
            >
              <Ionicons name="share-social" size={24} color="#3B82F6" />
              <Text style={{ fontSize: 10, color: theme.text, marginTop: 2, fontWeight: '600' }}>Share</Text>
            </TouchableOpacity>
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
    marginLeft: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openTabBtn: {
    padding: 6,
    marginLeft: 8,
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
    width: '100%',
    overflow: 'hidden',
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
