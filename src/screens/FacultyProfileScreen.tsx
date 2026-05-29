import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Faculty } from '@/data/faculty';
import { DEPARTMENTS } from '@/data/departments';

interface FacultyProfileScreenProps {
  faculty: Faculty;
  onBack: () => void;
}

export const FacultyProfileScreen: React.FC<FacultyProfileScreenProps> = ({ faculty, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const departmentName = DEPARTMENTS.find(d => d.id === faculty.department)?.name || faculty.department;

  const handleShare = async () => {
    try {
      await Share.share({
        title: faculty.name,
        message: `Read about ${faculty.name} (${faculty.designation}, ${departmentName}) on the official college portal:\n${faculty.profileUrl}\n\nShared from MCE Connect app.\nDownload here: https://play.google.com/store/apps/details?id=mcemotihari.app`,
      });
    } catch (error) {
      console.warn('Failed to share profile link:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.6}>
          <Ionicons name="close" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {faculty.name}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {faculty.designation} • Portal View
          </Text>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.6}>
          <Ionicons name="share-social" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* WebView Frame */}
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: faculty.profileUrl }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => <View />} // Handled by our custom spinner overlay
          showsVerticalScrollIndicator={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {/* Premium Spinner Overlay */}
        {isLoading && (
          <View style={styles.spinnerOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={styles.loadingText}>Connecting to campus server...</Text>
              <Text style={styles.loadingSubtext}>Loading academic profile natively</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0', // slate-200
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B', // slate-500
    marginTop: 1,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.95)', // Slate-50 with 95% opacity
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: `${0}px ${4}px ${12}px #0F172A`,

    elevation: 3,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
  },
});
