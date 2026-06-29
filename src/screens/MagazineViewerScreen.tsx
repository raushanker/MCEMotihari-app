import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { useAppStore } from '@/store/useAppStore';

interface MagazineViewerScreenProps {
  title: string;
  driveUrl: string;
  onBack: () => void;
}

export const MagazineViewerScreen: React.FC<MagazineViewerScreenProps> = ({ title, driveUrl, onBack }) => {
  const theme = useThemeColors();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);

  const savedMaterials = useAppStore(state => state.savedMaterials) || [];
  const toggleMaterialBookmark = useAppStore(state => state.toggleMaterialBookmark);

  const virtualMaterial = {
    id: driveUrl,
    title: title,
    fileUrl: driveUrl,
    subject: 'Magazine',
    branch: 'Department',
    semester: 'All',
    materialType: 'PDF',
    isLink: false,
    createdAt: new Date().toISOString()
  };

  const isBookmarked = savedMaterials.some((m: any) => m.id === virtualMaterial.id || m.fileUrl === driveUrl);

  const handleToggleBookmark = () => {
    toggleMaterialBookmark(virtualMaterial);
  };

  // Failsafe: hide custom loading overlay after 4 seconds to show Google Drive's native UI
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

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

  // Enforce preview mode
  const secureUrl = driveUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.headerBackBtn, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} 
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
        
        <TouchableOpacity 
          onPress={handleToggleBookmark} 
          style={styles.bookmarkBtn} 
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name={isBookmarked ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={isBookmarked ? "#F97316" : theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={[styles.errorTitle, { color: theme.text }]}>Failed to Load Magazine</Text>
            <Text style={[styles.errorSub, { color: theme.textSecondary }]}>
              The document could not be loaded. Please ensure you have an active internet connection.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setHasError(false); setIsLoading(true); setProgress(0); }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {Platform.OS === 'web' ? (
              <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <iframe
                  src={secureUrl}
                  sandbox="allow-scripts allow-same-origin"
                  style={{ 
                    width: '100%', 
                    height: secureUrl.includes('drive.google.com') ? 'calc(100% + 56px)' : '100%', 
                    marginTop: secureUrl.includes('drive.google.com') ? '-56px' : '0px',
                    border: 'none' 
                  }}
                  title={title}
                  onLoad={() => setIsLoading(false)}
                  onError={() => { setIsLoading(false); setHasError(true); }}
                />
              </div>
            ) : (
              <WebView
                source={{ uri: secureUrl }}
                style={styles.webview}
                userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
                onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setHasError(true); }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                cacheEnabled={true}
                cacheMode="LOAD_DEFAULT"
                startInLoadingState={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                originWhitelist={['*']}
                injectedJavaScript={injectedJS}
              />
            )}
            
            {/* Security Badge overlay to hide Google's pop-out button on BOTH web and native */}
            <View 
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
              <Ionicons name="shield-checkmark" size={22} color="#10B981" />
              <Text style={{ fontSize: 9, color: theme.text, marginTop: 2, fontWeight: '800' }}>SECURE</Text>
            </View>
            {isLoading && (
              <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading Magazine... {Math.round(progress * 100)}%
                </Text>
                <View style={[styles.progressBarBg, { backgroundColor: theme.isDark ? '#334155' : '#E2E8F0' }]}>
                  <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
                <Text style={[styles.loadingHint, { color: theme.textSecondary }]}>
                  This might take a moment depending on the PDF size.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  openTabBtn: { padding: 4, marginLeft: 8 },
  bookmarkBtn: { padding: 4, marginLeft: 12 },
  content: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  errorSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  progressBarBg: {
    width: 200,
    height: 6,
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  loadingHint: {
    marginTop: 16,
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 32,
  }
});
