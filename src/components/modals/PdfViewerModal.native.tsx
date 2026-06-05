import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import Pdf from 'react-native-pdf';

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
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const savedMaterials = useAppStore(state => state.savedMaterials) || [];
  const toggleMaterialBookmark = useAppStore(state => state.toggleMaterialBookmark);

  // Strip any corrupted q_auto parameter from Cloudinary PDF URLs
  const cleanUrl = url && url.includes('cloudinary.com') && url.includes('/q_auto/')
    ? url.replace('/q_auto/', '/')
    : url;

  // Run background fetch diagnostics when url or key changes
  useEffect(() => {
    if (!visible || !cleanUrl) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    console.log(`\n================== PDF VIEWER DEBUG (NATIVE) ==================`);
    console.log(`[PDF Viewer Debug] Target Clean URL: ${cleanUrl}`);

    const runDiagnostics = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(cleanUrl, { 
          method: 'HEAD',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (isMounted) {
          console.log(`[PDF Viewer Debug] Response Status: ${response.status} (${response.statusText || 'OK'})`);
          console.log(`[PDF Viewer Debug] Content-Type: ${response.headers.get('content-type')}`);
          console.log(`[PDF Viewer Debug] Content-Length: ${response.headers.get('content-length')}`);
          
          if (response.status === 401 || response.status === 403) {
            setError(`Security restriction: Cloudinary returned ${response.status} (Access Denied). Please ensure 'Allow delivery of PDF and ZIP files' is enabled in your Cloudinary Security Settings.`);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn(`[PDF Viewer Debug] Diagnostics request failed (running fallback check):`, err.message || err);
          try {
            const getResponse = await fetch(cleanUrl, { method: 'GET' });
            console.log(`[PDF Viewer Debug] Fallback GET Status: ${getResponse.status}`);
            console.log(`[PDF Viewer Debug] Fallback GET Content-Type: ${getResponse.headers.get('content-type')}`);
          } catch (fallbackErr: any) {
            console.error(`[PDF Viewer Debug] Fallback GET check also failed:`, fallbackErr.message || fallbackErr);
          }
        }
      }
    };

    runDiagnostics();

    return () => {
      isMounted = false;
    };
  }, [cleanUrl, visible, key]);

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
    setScale(1.0);
    setCurrentPage(1);
    setKey(prev => prev + 1);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

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
              <Text style={[styles.errorTitle, { color: theme.text }]}>Failed to load PDF</Text>
              <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>
                {error}
              </Text>
              <TouchableOpacity 
                style={[styles.retryBtn, { backgroundColor: '#F97316' }]} 
                onPress={handleReload}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry Loading</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Native View (react-native-pdf) */
            <Pdf
              key={key}
              source={{ uri: cleanUrl, cache: true }}
              scale={scale}
              onLoadComplete={(numberOfPages: number) => {
                console.log(`[PDF Viewer Debug] Native PDF Load Completed. Pages detected: ${numberOfPages}`);
                setTotalPages(numberOfPages);
                setIsLoading(false);
                setError(null);
              }}
              onPageChanged={(page: number) => {
                setCurrentPage(page);
              }}
              onError={(err: any) => {
                console.error(`[PDF Viewer Debug] Native PDF Viewer Error:`, err);
                setError(err.message || String(err));
                setIsLoading(false);
              }}
              style={styles.pdf}
            />
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

          {/* Floating HUD Controller (Native Only) */}
          {!error && !isLoading && (
            <View style={styles.floatingHUD}>
              {/* Zoom Controls */}
              <View style={[styles.hudSection, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                <TouchableOpacity onPress={zoomOut} style={styles.hudBtn}>
                  <Ionicons name="remove" size={20} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.scaleText, { color: theme.text }]}>
                  {Math.round(scale * 100)}%
                </Text>
                <TouchableOpacity onPress={zoomIn} style={styles.hudBtn}>
                  <Ionicons name="add" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Page Number Indicator */}
              {totalPages > 0 && (
                <View style={[styles.hudPageBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.pageBadgeText, { color: theme.text }]}>
                    Page {currentPage} of {totalPages}
                  </Text>
                </View>
              )}
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
  pdf: {
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
  floatingHUD: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  hudSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  hudBtn: {
    padding: 10,
  },
  scaleText: {
    fontSize: 13.5,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
  },
  hudPageBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  pageBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PdfViewerModal;
