import React, { useRef, useState } from 'react';
import { 
  StyleSheet, View, Text, Modal, TouchableOpacity, 
  ActivityIndicator, Dimensions, Platform, Share, Alert, Linking 
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface NoticesWebModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NoticesWebModal({ visible, onClose }: NoticesWebModalProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('https://www.mcemotihari.ac.in/category/notices/');

  const handleReload = () => {
    webViewRef.current?.reload();
  };

  const handleGoBack = () => {
    webViewRef.current?.goBack();
  };

  const handleGoForward = () => {
    webViewRef.current?.goForward();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `MCE Motihari Live Notice:\n${currentUrl}\n\nShared from MCE Connect app.\nDownload here: https://play.google.com/store/apps/details?id=mcemotihari.app`,
        title: 'Share MCE Notice Link',
      });
    } catch (e) {
      Alert.alert('Share Failed', 'Unable to share notice link.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={[styles.sheetHeader, { justifyContent: 'flex-start' }]}>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { marginRight: 12, marginLeft: -4 }]}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>

            <View style={[styles.headerLeft, { flex: 1 }]}>
              <View style={styles.iconContainer}>
                <Ionicons name="megaphone" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.sheetTitle}>Official Live Notices</Text>
                <Text style={styles.sheetSubtitle}>mcemotihari.ac.in • Notices Portal</Text>
              </View>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleReload} style={styles.headerActionBtn}>
                <Ionicons name="refresh" size={18} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.headerActionBtn}>
                <Ionicons name="share-social" size={18} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Web Browser WebView Content */}
          <View style={styles.webContainer}>
            {visible && Platform.OS === 'web' ? (
              <iframe 
                src="https://www.mcemotihari.ac.in/category/notices/"
                style={{ width: '100%', height: '100%', border: 'none' }}
                onLoad={() => setIsLoading(false)}
              />
            ) : visible && (
            <WebView
              ref={webViewRef}
              source={{ uri: 'https://www.mcemotihari.ac.in/category/notices/' }}
              style={styles.webView}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onNavigationStateChange={(navState) => {
                setCanGoBack(navState.canGoBack);
                setCanGoForward(navState.canGoForward);
                setCurrentUrl(navState.url);
              }}
              onShouldStartLoadWithRequest={(request: WebViewNavigation) => {
                const { url } = request;
                if (url.toLowerCase().endsWith('.pdf')) {
                  if (Platform.OS === 'android') {
                    // Android WebView cannot render PDFs natively. Open with system handler.
                    Linking.openURL(url).catch(() => {
                      Alert.alert('Error', 'Unable to open PDF.');
                    });
                    return false;
                  } else if (Platform.OS === 'web') {
                    window.location.href = url;
                    return false;
                  }
                  // iOS handles PDFs natively in WebView.
                  return true;
                }
                return true;
              }}
              // Custom CSS to hide unnecessary desktop elements if needed for responsive view
              injectedJavaScript={`
                const style = document.createElement('style');
                style.innerHTML = '.site-header, .site-footer, .widget-area { display: none !important; }';
                document.head.appendChild(style);
              `}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              setSupportMultipleWindows={false}
            />
            )}

            {/* Spinner Overlay */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#F97316" />
                <Text style={styles.loadingText}>Syncing live notice board...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.9,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  closeBtn: {
    padding: 2,
    marginLeft: 4,
  },
  webContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  webFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 16 : 10,
    backgroundColor: '#FFFFFF',
  },
  footerNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerNavBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  secureConnectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#DCFCE7',
  },
  secureConnectionText: {
    fontSize: 10.5,
    color: '#16A34A',
    fontWeight: '700',
  },
});
