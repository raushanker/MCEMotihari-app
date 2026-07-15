import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';

export function SmartAppBanner() {
  const theme = useThemeColors();
  const [showBanner, setShowBanner] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('desktop');

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if user dismissed the banner previously in this session/browser
      const dismissed = localStorage.getItem('mce_app_prompt_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }

      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android')) {
        setDeviceType('android');
      } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        setDeviceType('ios');
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('mce_app_prompt_dismissed', 'true');
  };

  const handleAndroidRedirect = () => {
    if (Platform.OS === 'web') {
      const cleanPath = window.location.pathname.replace(/^\//, '');
      const deepLink = `mcemotihari://${cleanPath}${window.location.search}`;
      const playStoreUrl = `https://play.google.com/store/apps/details?id=mcemotihari.app`;

      console.log('[SmartAppBanner] Redirecting to deep link:', deepLink);
      window.location.href = deepLink;

      // Fallback to Play Store if app is not installed
      setTimeout(() => {
        window.location.href = playStoreUrl;
      }, 1500);
    }
  };

  if (Platform.OS !== 'web' || !showBanner) {
    return null;
  }

  return (
    <View style={styles.promptOverlay}>
      <View style={[styles.promptCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        {/* Close Button */}
        <TouchableOpacity style={styles.promptCloseBtn} onPress={handleDismiss}>
          <Ionicons name="close" size={18} color={theme.text} />
        </TouchableOpacity>

        {deviceType === 'android' ? (
          <View style={styles.promptContent}>
            <Text style={styles.promptEmoji}>🚀</Text>
            <Text style={[styles.promptTitle, { color: theme.text }]}>Open in MCE Connect App?</Text>
            <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
              Get real-time notices, chat feeds, offline study materials, and a faster experience inside our Android App.
            </Text>
            <TouchableOpacity style={styles.promptMainBtn} onPress={handleAndroidRedirect}>
              <Text style={styles.promptMainBtnText}>Open / Install App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptSecBtn} onPress={handleDismiss}>
              <Text style={[styles.promptSecBtnText, { color: theme.textSecondary }]}>Continue in Browser</Text>
            </TouchableOpacity>
          </View>
        ) : deviceType === 'ios' ? (
          <View style={styles.promptContent}>
            <Text style={styles.promptEmoji}>📲</Text>
            <Text style={[styles.promptTitle, { color: theme.text }]}>Install App on iPhone</Text>
            <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
              Add this verified portal to your iPhone Home Screen for easy campus access:
            </Text>
            <View style={styles.iosInstructionBox}>
              <Text style={[styles.instructionStep, { color: theme.text }]}>
                1. Tap Share <Ionicons name="share-outline" size={14} color={theme.text} /> at Safari's bottom.
              </Text>
              <Text style={[styles.instructionStep, { color: theme.text }]}>
                2. Select <Text style={{ fontWeight: 'bold' }}>"Add to Home Screen"</Text> <Ionicons name="add-circle-outline" size={14} color={theme.text} />.
              </Text>
            </View>
            <TouchableOpacity style={styles.promptMainBtn} onPress={handleDismiss}>
              <Text style={styles.promptMainBtnText}>Got it, Thanks!</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.promptContent}>
            <Text style={styles.promptEmoji}>💻</Text>
            <Text style={[styles.promptTitle, { color: theme.text }]}>MCE Connect on Android</Text>
            <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
              Download our official mobile application for instant notifications, alumni registry, and academic notes.
            </Text>
            <TouchableOpacity style={styles.promptMainBtn} onPress={() => window.open('https://play.google.com/store/apps/details?id=mcemotihari.app', '_blank')}>
              <Text style={styles.promptMainBtnText}>Download Android App</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptSecBtn} onPress={handleDismiss}>
              <Text style={[styles.promptSecBtnText, { color: theme.textSecondary }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  promptOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  promptCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative',
  },
  promptCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  promptContent: {
    alignItems: 'center',
  },
  promptEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  promptDesc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  promptMainBtn: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  promptMainBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  promptSecBtn: {
    marginTop: 10,
    paddingVertical: 6,
  },
  promptSecBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iosInstructionBox: {
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 14,
    padding: 12,
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 16,
  },
  instructionStep: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
});
