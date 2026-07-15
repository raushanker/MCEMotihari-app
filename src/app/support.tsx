import React, { useState } from 'react';
import { 
  StyleSheet, View, Text,  TouchableOpacity, ScrollView, 
  Alert, KeyboardAvoidingView, Platform, Dimensions, Linking 
} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { useExploreBack } from '@/hooks/useExploreBack';

const { width } = Dimensions.get('window');

const SUPPORT_REASONS = [
  'Technical Issue',
  'Profile Modification',
  'Study Material Upload',
  'Notice Board Queries',
  'General Inquiry',
  'Other Feedback'
];

export default function ContactSupportScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleExploreBack = useExploreBack();

  const handleBack = () => {
    if (from === 'explore') {
      handleExploreBack(from);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // No form states needed anymore

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Dynamic SEO Meta Title Mock for Web builds */}
      {Platform.OS === 'web' && (
        <title>Help & Support Desk - MCE Connect Platform</title>
      )}

      {/* Premium Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, paddingTop: insets.top, paddingBottom: 10 }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: theme.background }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support Desk</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner Alert card - Independence Disclosure */}
        <View style={[styles.bannerCard, { backgroundColor: theme.isDark ? '#1E293B' : '#EFF6FF', borderColor: theme.isDark ? '#334155' : '#BFDBFE', borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 12 }]}>
          <Ionicons name="information-circle-outline" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.isDark ? '#93C5FD' : '#1E40AF', flex: 1, fontWeight: '500' }}>
            <Text style={{ fontWeight: 'bold' }}>Community Desk Notice:</Text> MCE Connect is an independent community initiative developed by alumni and contributors for educational and networking purposes.
          </Text>
        </View>

        {/* Support Branding Intro Card */}
        <View style={[styles.introCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.supportIconBg}>
            <Ionicons name="mail" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.introMeta}>
            <Text style={[styles.introTitle, { color: theme.text }]}>Contact Support</Text>
            <Text style={[styles.introText, { color: theme.textSecondary }]}>
              If you have any queries, technical issues, or feedback, you can reach out to our tech desk directly via email.
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={async () => {
            const emailAddress = 'mcemotihari.tech@gmail.com';
            const subject = 'Support Request - MCE Connect';
            const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}`;
            
            try {
              await Linking.openURL(mailtoUrl);
            } catch (err) {
              Alert.alert(
                'Email Client Not Found',
                `Could not open email app. Please send an email directly to:\n\n${emailAddress}`
              );
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.submitBtnText}>Email Support Team</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${4}px #000` : undefined,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  introCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  supportIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  introMeta: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  introText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    height: 46,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #F97316` : undefined,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  }
});
