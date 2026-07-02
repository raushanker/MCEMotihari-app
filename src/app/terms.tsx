import React from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  Platform, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

const { width } = Dimensions.get('window');

export default function TermsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const currentDate = '6 June 2026';

  const sections = [
    { id: 'behavior', label: 'Respectful Behavior' },
    { id: 'prohibited', label: 'Prohibited Actions' },
    { id: 'academic', label: 'Academic & Copyright' },
    { id: 'anonymous', label: 'Anonymous Responsibility' },
    { id: 'moderation', label: 'Moderation Rights' },
    { id: 'liability', label: 'Disclaimer & Liability' }
  ];

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar
        backgroundColor={theme.backgroundElement}
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      {/* Dynamic SEO Meta Title Mock for Web builds */}
      {Platform.OS === 'web' && (
        <title>Terms & Community Guidelines - MCE Connect Platform</title>
      )}

      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, paddingTop: 10, paddingBottom: 10 }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: theme.background }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Terms & Guidelines</Text>
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
          <Ionicons name="information-circle-outline" size={22} color="#3B82F6" style={{ marginRight: 10 }} />
          <Text style={[styles.bannerText, { color: theme.isDark ? '#93C5FD' : '#1E40AF' }]}>
            <Text style={{ fontWeight: 'bold' }}>Purpose & Scope:</Text> The MCE Connect platform is intended primarily for academic networking, alumni mentoring, study material coordination, and professional campus collaboration. It is an independent, non-official alumni-led initiative.
          </Text>
        </View>

        {/* Dynamic Navigation Shortcut Anchors */}
        <View style={styles.anchorContainer}>
          <Text style={[styles.anchorHeading, { color: theme.textSecondary }]}>QUICK SECTIONS</Text>
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

        {/* Section 1: Respectful Behavior */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>1. Respectful Behavior</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            We aim to foster a helpful, friendly, and supportive community environment. You are expected to show professional respect to all peer students, alumni members, and academic faculty directory members. Harassment, verbal abuse, bullying, or hate speech of any kind is strictly prohibited and will lead to an immediate and permanent account suspension.
          </Text>
        </View>

        {/* Section 2: Prohibited Actions */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>2. Prohibited Actions</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            By signing in, you agree that you will not post:
            {"\n\n"}
            • Commercial spam, political propaganda, or religious propaganda.
            {"\n\n"}
            • Explicit, pornographic, or violent images and media attachments.
            {"\n\n"}
            • Material that impersonates other college administration staff, students, or public contributors. Impersonating senior alumni or placing false branch/batch details to secure fake verification will result in active account termination and reporting to appropriate community supervisors.
          </Text>
        </View>

        {/* Section 3: Academic Copyright */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="book-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>3. Academic Copyright & Integrity</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            Users are solely responsible for academic study materials, question papers, and notes they attach.
            {"\n\n"}
            Do not upload confidential college examinations, copyrighted academic publications, or copyrighted textbooks without appropriate permissions. MCE Connect respects intellectual property rights, and we will immediately process valid copyright takedown notices sent to our support desk.
          </Text>
        </View>

        {/* Section 4: Anonymous posting */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="eye-off-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>4. Anonymous Posting Responsibility</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            The "Post Anonymously" selector is provided purely for students to discuss campus questions, hostel life, exam feedback, and placement dilemmas without career hesitation.
            {"\n\n"}
            It is <Text style={{ fontWeight: 'bold', color: theme.text }}>NOT</Text> a license to insult faculty, target other students, spread false rumors, or bypass guidelines. In case of toxic behavior, backend logs are investigated, and your moderation rating will be affected.
          </Text>
        </View>

        {/* Section 5: Moderation & content removal */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#F97316" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>5. Moderation and Removal Rights</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            Alumni moderators and app contributors reserve the absolute right to review, edit, anonymize, or permanently delete any community post, poll, or comment that violates these guidelines.
            {"\n\n"}
            We may restrict posting capabilities or ban specific email domains in case of automated spam attacks.
          </Text>
        </View>

        {/* Section 6: Limitation of Liability */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>6. Limitation of Liability</Text>
          </View>
          <Text style={[styles.cardBodyText, { color: theme.textSecondary }]}>
            MCE Connect is provided on an "as-is" and "as-available" basis without warranties of any kind.
            {"\n\n"}
            We aggregate college/university announcements simply for ease of navigation. We are not responsible for schedule modifications, university examination form revisions, or academic cancellations. Students must verify critical notices with official college authorities.
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0px 2px 4px rgba(0,0,0,0.08)' : undefined,
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
