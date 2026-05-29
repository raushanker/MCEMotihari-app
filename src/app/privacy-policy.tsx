import React from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  Platform, Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const currentDate = 'May 2026';

  const sections = [
    { id: 'intro', label: '1. Introduction' },
    { id: 'disclaimer', label: '2. Disclaimer' },
    { id: 'profile', label: '3. Profile Visibility' },
    { id: 'collection', label: '4. Data Collection' },
    { id: 'storage', label: '5. Local Storage' },
    { id: 'content', label: '6. Community Content' },
    { id: 'sources', label: '7. Notices & Sources' },
    { id: 'controls', label: '8. User Controls' },
    { id: 'deletion', label: '9. Account Deletion' },
    { id: 'contact', label: '10. Contact Info' },
    { id: 'updates', label: '11. Policy Updates' }
  ];

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Dynamic SEO Meta Title for Web builds */}
      {Platform.OS === 'web' && (
        <title>Privacy Policy - MCE Connect Platform</title>
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Last Updated: {currentDate}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Alert card - Independence Disclosure */}
        <View style={[styles.bannerCard, { backgroundColor: theme.isDark ? '#1E293B' : '#EFF6FF', borderColor: theme.isDark ? '#334155' : '#BFDBFE' }]}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#3B82F6" style={{ marginRight: 10, marginTop: 2 }} />
          <Text style={[styles.bannerText, { color: theme.isDark ? '#93C5FD' : '#1E40AF' }]}>
            <Text style={{ fontWeight: 'bold' }}>Play Store Compliance Notice:</Text> This policy has been fully structured to support complete data clarity, safety, and user-choice integrity on our independent student network.
          </Text>
        </View>

        {/* Dynamic Navigation Shortcut Anchors */}
        <View style={styles.anchorContainer}>
          <Text style={[styles.anchorHeading, { color: theme.textSecondary }]}>QUICK NAVIGATION SECTIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.anchorScroll}>
            {sections.map((sec, idx) => (
              <View 
                key={idx}
                style={[styles.anchorTag, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              >
                <Text style={[styles.anchorTagText, { color: '#F97316' }]}>{sec.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Section 1: Introduction */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>1. Introduction</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            Welcome to the MCE Connect platform. We respect the privacy of our community members and are committed to safeguarding your personal data.
            {"\n\n"}
            This Privacy Policy explains how your information is collected, processed, displayed, and protected when using our mobile application and web portals. By creating an account or accessing the platform, you agree to the collection and use of information in accordance with this policy.
          </Text>
        </View>

        {/* Section 2: Independent Platform Disclaimer */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>2. Independent Platform Disclaimer</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            “MCE Connect is an independent alumni-led student community platform created for educational networking purposes.
            {"\n\n"}
            This platform is <Text style={{ fontWeight: 'bold', color: theme.text }}>NOT</Text> officially operated by Motihari College of Engineering Motihari (mcemotihari.ac.in).
            {"\n\n"}
            Some publicly available institutional information, notices, and references may be displayed with proper source attribution and original source URLs.”
          </Text>
        </View>

        {/* Section 3: Public Profile Visibility */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="eye-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>3. Public Profile Visibility</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            MCE Connect is a networking platform intended to facilitate interactions among students, faculty, and alumni.
            {"\n\n"}
            • <Text style={{ fontWeight: 'bold', color: theme.text }}>Directory Parameters:</Text> Your profile details, including your full name, chosen @username, academic branch, graduation batch, bio, and profile photo, are visible to other logged-in members inside the campus directory and community feeds.
            {"\n\n"}
            • <Text style={{ fontWeight: 'bold', color: theme.text }}>Avatar Safeguard:</Text> To protect your privacy, you are fully allowed to configure customizable avatars and abstract illustrations instead of uploading a real photograph.
            {"\n\n"}
            We do <Text style={{ fontWeight: 'bold', color: theme.text }}>NOT</Text> expose your profile to public Google search engines or sell profile directories to advertising companies.
          </Text>
        </View>

        {/* Section 4: What Data We Collect */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-upload-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>4. Data Collection</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            We collect the minimum necessary data to authenticate your account and ensure secure community networking:
            {"\n\n"}
            • <Text style={{ fontWeight: 'bold', color: theme.text }}>Google Authentication:</Text> During Google Sign-In, we collect your verified email address, Google account name, and your default Google profile photo URL to create your MCE Connect account.
            {"\n\n"}
            • <Text style={{ fontWeight: 'bold', color: theme.text }}>Email/Password Details:</Text> If registering via email/password, we collect your email address and store a cryptographically hashed representation of your password inside Firebase Auth.
            {"\n\n"}
            • <Text style={{ fontWeight: 'bold', color: theme.text }}>Media Attachments:</Text> Images uploaded during post creation or profile updates are processed via Cloudinary and securely stored under Firebase Cloud Storage bucket structures.
          </Text>
        </View>

        {/* Section 5: Local Device Storage */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="save-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>5. Local Device Storage</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            We utilize AsyncStorage on your local mobile device to store personal parameters:
            {"\n\n"}
            • <Text style={{ fontWeight: 'bold', color: theme.text }}>Personal Notes & Subject Bookmarks:</Text> Academic notes you draft, syllabus chapters you track, and forum posts you bookmark are saved <Text style={{ fontWeight: 'bold' }}>strictly on your own local device storage</Text>.
            {"\n\n"}
            • <Text style={{ fontWeight: 'bold', color: theme.text }}>No Cloud Backups:</Text> We do not synchronize or back up your private local notes/bookmarks to our databases. If you uninstall the mobile app or clear the application cache, these files will be permanently erased.
          </Text>
        </View>

        {/* Section 6: Community Content */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>6. Community Content</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            All community text posts, polls, votes, comments, and attachments you choose to post inside the Home Feed are stored on our secure cloud database.
            {"\n\n"}
            • <Text style={{ fontWeight: 'bold', color: theme.text }}>Anonymous Posting Toggles:</Text> When you toggle the "Post Anonymously" option in the composer, your public username and photo are masked from the visible feed headers. However, your user UID is preserved securely on the backend database to satisfy safety regulations and block community harassment.
          </Text>
        </View>

        {/* Section 7: Notices & External Sources */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>7. Notices & External Sources</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            “College and university notices shown inside the Notice Board may originate from publicly accessible institutional portals. Original source names and links are displayed wherever applicable.”
            {"\n\n"}
            We fetch and parse public notices from official web portals using proxies solely for the immediate accessibility of students. We do not modify the original text, examination forms, or academic attachment PDFs.
          </Text>
        </View>

        {/* Section 8: User Controls & Future-Feature Disclaimer */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-network-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>8. User Controls & Scope</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            You have full control over your profile visibility, theme options, and post creation parameters.
            {"\n\n"}
            “Future collaborative features including messaging, chat systems, mentorship, and alumni networking may be introduced in later platform updates.”
            {"\n\n"}
            Currently, our platform scope focuses strictly on community posting, academic updates, notices, student networking directory index, and syllabus study materials.
          </Text>
        </View>

        {/* Section 9: Account Deletion */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>9. Account Deletion</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            You have the absolute right to purge your personal details and terminate your membership at any time.
            {"\n\n"}
            You can initiate a verified deletion request on the "Delete Account" screen in the legal hub below, or send an email to <Text style={{ fontWeight: 'bold', color: theme.text }}>mcemotihari.tech@gmail.com</Text>.
            {"\n\n"}
            Upon processing, your email credentials, real name, and photo details are permanently scrubbed from the active directory within 4-7 business days. Public forum threads remain in completely anonymized formats.
          </Text>
        </View>

        {/* Section 10: Contact Information */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>10. Contact Information</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            For any queries regarding this Privacy Policy, your profile data, or copyright takedown requests, write to our technical desk:
            {"\n\n"}
            ✉ Email: <Text style={{ fontWeight: 'bold', color: theme.text }}>mcemotihari.tech@gmail.com</Text>
          </Text>
        </View>

        {/* Section 11: Policy Updates */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>11. Policy Updates</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            We reserve the right to modify this Privacy Policy at any time to accommodate new Play Store safety guidelines or platform features.
            {"\n\n"}
            Any updates will be immediately published on this page, and the "Last Updated" revision timestamp will be adjusted accordingly.
          </Text>
        </View>

        {/* Page Footer Navigation Links */}
        <View style={[styles.footerCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.footerHeading, { color: theme.text }]}>MCE Connect Legal Hub</Text>
          <View style={styles.footerLinksGrid}>
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

            <TouchableOpacity 
              style={[styles.footerLinkBtn, { backgroundColor: theme.background }]} 
              onPress={() => router.push('/delete-account')}
            >
              <Text style={[styles.footerLinkText, { color: '#EF4444' }]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={12} color="#EF4444" />
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
  anchorContainer: {
    gap: 8,
  },
  anchorHeading: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  anchorScroll: {
    gap: 8,
  },
  anchorTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  anchorTagText: {
    fontSize: 11.5,
    fontWeight: '700',
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
