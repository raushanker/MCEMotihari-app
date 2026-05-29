import React from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  Platform, Linking, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const currentDate = 'May 2026';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleSendDeletionEmail = async () => {
    const emailAddress = 'mcemotihari.tech@gmail.com';
    const subject = 'MCE Connect - Account Deletion Request';
    const body = `Hello MCE Connect Technical Support Team,

I am writing to formally request the complete deletion of my account and all associated profile data from the MCE Connect platform.

Here are my account details for verification:
- Google Account Email: 
- Custom Username (@): 
- Branch & Batch: 

Reason for deletion (Optional):


By sending this request, I understand that my directory profile, registered credentials, and personal verification details will be permanently purged within 4-7 business days.

Regards,`;

    const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      await Linking.openURL(mailtoUrl);
    } catch (err) {
      Alert.alert(
        'Email Client Not Found',
        `Default email client set up nahi hai.\n\nKripya direct email karein:\nTo: ${emailAddress}\nSubject: ${subject}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Dynamic SEO Meta Title Mock for Web builds */}
      {Platform.OS === 'web' && (
        <title>Delete Account & Data Deletion - MCE Connect Platform</title>
      )}

      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: theme.background }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Delete Account</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Last Updated: {currentDate}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Alert card - Independence Disclosure */}
        <View style={[styles.bannerCard, { backgroundColor: theme.isDark ? '#3F1F1F' : '#FEF2F2', borderColor: theme.isDark ? '#5F2F2F' : '#FCA5A5' }]}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" style={{ marginRight: 10 }} />
          <Text style={[styles.bannerText, { color: theme.isDark ? '#FCA5A5' : '#991B1B' }]}>
            <Text style={{ fontWeight: 'bold' }}>Permanent Action Notice:</Text> Account deletion is irreversible. Your profile card will be permanently purged from the campus directory, and you will lose all network connections.
          </Text>
        </View>

        {/* Section 1: How Deletion Works */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="help-circle-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>1. How Can I Request Account Deletion?</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            Since we utilize Google Authentication for secure registration, accounts must be formally purged by our tech administrator to ensure credentials, Firestore indexes, and storage uploads are cleaned cleanly.
            {"\n\n"}
            You can trigger an automated deletion email draft by clicking the red button below, or write a direct mail to <Text style={{ fontWeight: 'bold', color: theme.text }}>mcemotihari.tech@gmail.com</Text> using your registered email address.
          </Text>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={handleSendDeletionEmail}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-open" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Request Account Deletion via Email</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: What Gets Deleted */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>2. What Data Gets Permanently Purged?</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            Upon completing your deletion request, the following components are permanently removed:
            {"\n\n"}
            • Your profile card (Real Name, Branch, Batch, Bio, verification rating) from the Public Directory.
            {"\n\n"}
            • Your Google authentication credentials, profile link, and session logs in our Firestore database.
            {"\n\n"}
            • Your connection records, bookmark lists, and private moderation rating parameters.
          </Text>
        </View>

        {/* Section 3: Anonymization Context */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-branch-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>3. What Data Remains Anonymized?</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            To preserve the continuity of general student forum discussions, academic study references, or question answer threads, posts and comments you actively created in public feeds will remain visible but will be completely anonymized.
            {"\n\n"}
            The author header will be permanently scrubbed and replaced with <Text style={{ fontStyle: 'italic', color: theme.text }}>"Anonymized Contributor"</Text> or <Text style={{ fontStyle: 'italic', color: theme.text }}>"Former Student"</Text>, and all profile images or back-reference links to your deleted profile will be cleared.
          </Text>
        </View>

        {/* Section 4: Timeline */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>4. Approximate Deletion Timeline</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            Deletion requests are typically processed within <Text style={{ fontWeight: 'bold', color: theme.text }}>4 to 7 business days</Text> after email confirmation.
            {"\n\n"}
            Once complete, you will receive a final technical receipt confirmation email from our support desk, after which your data is purged from all backups.
          </Text>
        </View>

        {/* Page Footer Navigation Links */}
        <View style={[styles.footerCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.footerHeading, { color: theme.text }]}>MCE Connect Legal Hub</Text>
          <View style={styles.footerLinksGrid}>
            <TouchableOpacity 
              style={[styles.footerLinkBtn, { backgroundColor: theme.background }]} 
              onPress={() => router.push('/privacy-policy')}
            >
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={12} color="#F97316" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.footerLinkBtn, { backgroundColor: theme.background }]} 
              onPress={() => router.push('/terms')}
            >
              <Text style={styles.footerLinkText}>Terms & Guidelines</Text>
              <Ionicons name="chevron-forward" size={12} color="#F97316" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.footerLinkBtn, { backgroundColor: theme.background }]} 
              onPress={() => router.push('/support')}
            >
              <Text style={styles.footerLinkText}>Contact & Support</Text>
              <Ionicons name="chevron-forward" size={12} color="#F97316" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.footerDisclaimerText, { color: theme.textSecondary }]}>
            Inquiries: <Text style={{ fontWeight: 'bold' }}>mcemotihari.tech@gmail.com</Text>
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.08)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  bannerCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  bannerText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardBodyText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionBtn: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    boxShadow: '0px 4px 8px rgba(239, 68, 68, 0.25)',
    elevation: 2,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footerCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    marginTop: 10,
  },
  footerHeading: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  footerLinksGrid: {
    gap: 8,
  },
  footerLinkBtn: {
    flexDirection: 'row',
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  footerLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F97316',
  },
  footerDisclaimerText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
});
