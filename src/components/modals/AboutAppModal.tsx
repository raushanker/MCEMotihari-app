import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailModal } from './DetailModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';


interface AboutAppModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutAppModal({ visible, onClose }: AboutAppModalProps) {
  const theme = useThemeColors();
  const router = useRouter();

  const handleEmailPress = () => {
    if (Platform.OS === 'web') {
      window.location.href = 'mailto:mcemotihari.tech@gmail.com?subject=MCE%20Connect%20Feedback';
      return;
    }
    const { Linking } = require('react-native');
    Linking.openURL('mailto:mcemotihari.tech@gmail.com?subject=MCE%20Connect%20Feedback');
  };

  const handlePlayStorePress = () => {
    if (Platform.OS === 'web') {
      window.open('https://play.google.com/store/apps/details?id=mcemotihari.app', '_blank');
      return;
    }
    const { Linking } = require('react-native');
    Linking.openURL('https://play.google.com/store/apps/details?id=mcemotihari.app');
  };

  return (
    <DetailModal visible={visible} title="About MCE Connect" onClose={onClose}>
      {/* ─── APP IDENTITY BRANDING CARD ─── */}
      <View style={[styles.brandCard, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFF8F2', borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.2)' : '#FFEAE0' }]}>
        <View style={styles.logoRing}>
          <Image
            source={require('../../../assets/images/mce-logo.png')}
            style={styles.logo}
          />
        </View>
        <Text style={[styles.appName, { color: theme.text }]}>MCE Motihari: Connect</Text>
        <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 2.0.0 (Latest Release)</Text>
        
        <View style={styles.verifiedRow}>
          <View style={[styles.verifiedBadge, { backgroundColor: '#10B981' }]}>
            <Ionicons name="checkmark-circle" size={12} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.verifiedBadgeText}>Play Protect Verified</Text>
          </View>
          <View style={[styles.verifiedBadge, { backgroundColor: '#3B82F6' }]}>
            <Ionicons name="logo-android" size={12} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.verifiedBadgeText}>Official Store App</Text>
          </View>
        </View>
      </View>

      {/* ─── PURPOSE SECTION ─── */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Aim & Purpose 🎯</Text>
      <Text style={[styles.introText, { color: theme.textSecondary }]}>
        MCE Motihari: Connect ka mukhya uddeshya Motihari College of Engineering ke pure academic ecosystem ko digital platform par ek sath jodna hai.
      </Text>

      {/* Student Card */}
      <View style={[styles.audienceCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="school" size={20} color="#3B82F6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Students Ke Liye 🎓</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            Real-time official notices padhein, academic syllabus aur study materials directly access karein, holidays aur fests calendar dekhein, aur seniors se instant connect hokar mentorship lein.
          </Text>
        </View>
      </View>

      {/* Alumni Card */}
      <View style={[styles.audienceCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="ribbon" size={20} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Alumni Network Ke Liye 🎖️</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            Apne old batchmates se connect rahein, junior students ko guidance aur path-finding support dein, college activities se connected rahein aur direct internship/career notifications share karein.
          </Text>
        </View>
      </View>

      {/* Faculty Card */}
      <View style={[styles.audienceCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        <View style={[styles.iconBox, { backgroundColor: '#EEF2F6' }]}>
          <Ionicons name="people" size={20} color="#475569" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Faculty Members Ke Liye 📚</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            Apne departments ke related announcements broadcast karein, study materials provide karein, campus events update karein, aur bina kisi hassle ke students se touch me rahein.
          </Text>
        </View>
      </View>

      {/* ─── SECURITY & PLAY STORE POLICIES ─── */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Security & Data Protection 🔒</Text>
      <View style={[styles.infoCallout, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5', borderColor: theme.isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
        <Ionicons name="shield-checkmark" size={20} color="#10B981" style={{ marginRight: 10, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>100% Verified & Safe!</Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
            Aapke data aur privacy ki suraksha hamari absolute priority hai. App fully Google Play Protect verified hai aur isme koi data privacy ya security leakage issue nahi hai. Aap exact data control janne ke liye is page par available <Text onPress={() => { onClose(); router.push('/privacy-policy'); }} style={{ fontWeight: 'bold', textDecorationLine: 'underline', color: '#10B981' }}>Privacy Policy</Text> read kar sakte hain.
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginTop: 8 }}>
            ⚠️ Security Note: Hamesha app ko verified Google Play Store ya Apple App Store (Will live soon) se hi download karein, unverified sources se bachein.
          </Text>
        </View>
      </View>

      {/* ─── GUEST vs LOGIN BENEFITS ─── */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Guest Mode vs User Login 🔑</Text>
      <View style={[styles.rowFeature, { borderBottomColor: theme.cardBorder }]}>
        <Ionicons name="eye-outline" size={16} color="#F97316" style={{ width: 24 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.featureHeading, { color: theme.text }]}>Guest Explore Mode (Without Login)</Text>
          <Text style={[styles.featureSub, { color: theme.textSecondary }]}>
            Aap bina sign-in kiye feeds scroll kar sakte hain, notices check kar sakte hain, syllabus aur academic calendar explore kar sakte hain bina kisi restrictions ke.
          </Text>
        </View>
      </View>
      <View style={[styles.rowFeature, { borderBottomColor: theme.cardBorder }]}>
        <Ionicons name="create-outline" size={16} color="#F97316" style={{ width: 24 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.featureHeading, { color: theme.text }]}>Authorized Mode (With Google Login)</Text>
          <Text style={[styles.featureSub, { color: theme.textSecondary }]}>
            Aap campus feed me updates post kar sakte hain, events upload kar sakte hain, reactions aur comments share kar sakte hain, aur seniors/juniors ko direct connection request send kar sakte hain.
          </Text>
        </View>
      </View>
      <View style={styles.rowFeature}>
        <Ionicons name="chatbubbles-outline" size={16} color="#94A3B8" style={{ width: 24 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.featureHeading, { color: theme.textSecondary }]}>Direct Messaging Facilities (Coming Soon)</Text>
          <Text style={[styles.featureSub, { color: theme.textSecondary }]}>
            Chatting capabilities abhi is version me build phase me hai. Hamari development team actively ispar work kar rahi hai aur aane wale new update me direct high-speed chat system integrate kar diya jayega!
          </Text>
        </View>
      </View>

      {/* ─── HISTORY & DEVELOPMENT ─── */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>App History & Journey 🚀</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        Is application ko <Text style={{ fontWeight: 'bold', color: theme.text }}>MCE Alumnus</Text> dwara personally develop aur manage kiya ja raha hai.
      </Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        Initially, is application ka pehla experimental version **2022** me **2k20 batch ke alumnus** dwara develop kiya gaya tha, jise us time 300+ students aur alumni ne active user ban kar support kiya tha. Parantu, kuch samay baad deployment accounts ke crucial security credentials lost ho jaane ke kaaran us app me new features aur update dena asambhav ho gaya.
      </Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        Usi legacy ko modern tech architecture (React Native 0.81, Expo, and Cloud Firestore) par fully revamping aur fast security engine ke sath is **rebuilt version** ke roop me aapke samne laya gaya hai!
      </Text>

      {/* ─── RATE & REVIEW CARD ─── */}
      <TouchableOpacity 
        style={[styles.contactCard, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.06)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#BFDBFE', marginTop: 20 }]}
        onPress={handlePlayStorePress}
        activeOpacity={0.8}
      >
        <Ionicons name="star" size={24} color="#3B82F6" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.contactTitle, { color: '#3B82F6' }]}>Rate & Review us on Play Store! ⭐</Text>
          <Text style={[styles.contactDesc, { color: theme.textSecondary }]}>
            Agar aapko MCE Connect pasand aaya, toh kripya Google Play Store par jakar apna valuable feedback, rating aur review jaroor dein. It motivates us to keep building!
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#3B82F6', textDecorationLine: 'underline' }}>
            Tap here to open Play Store
          </Text>
        </View>
      </TouchableOpacity>

      {/* ─── CONTACT & SUPPORT CARD ─── */}
      <TouchableOpacity 
        style={[styles.contactCard, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.06)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFE3D3', marginTop: 12 }]}
        onPress={handleEmailPress}
        activeOpacity={0.8}
      >
        <Ionicons name="mail-unread-outline" size={24} color="#F97316" />
        <View style={{ flex: 1 }}>
          <Text style={styles.contactTitle}>Keep Supporting & Suggestions! 🎖️</Text>
          <Text style={[styles.contactDesc, { color: theme.textSecondary }]}>
            App ke improvements, bug reports aur features suggestions ke liye drop us a mail directly. Tapping this card will open your email app.
          </Text>
          <Text style={styles.contactEmail}>mcemotihari.tech@gmail.com</Text>
        </View>
      </TouchableOpacity>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  brandCard: {
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  logoRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  appVersion: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  verifiedRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 10,
  },
  introText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  audienceCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  infoCallout: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  rowFeature: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  featureHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  richTextParagraph: {
    fontSize: 12.5,
    lineHeight: 19.5,
    marginBottom: 8,
  },
  contactCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    gap: 14,
    alignItems: 'flex-start',
  },
  contactTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#F97316',
    marginBottom: 4,
  },
  contactDesc: {
    fontSize: 11.5,
    lineHeight: 17,
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F97316',
    textDecorationLine: 'underline',
  },
});

export default AboutAppModal;
