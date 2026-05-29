import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, 
  Alert, KeyboardAvoidingView, Platform, Dimensions, Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

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

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleDraftEmail = async () => {
    // Validations
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Kripya apna Naam darj karein!');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation Error', 'Kripya ek valid Email address darj karein!');
      return;
    }
    if (!selectedReason) {
      Alert.alert('Validation Error', 'Kripya support ka Reason select karein!');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Kripya description me details likhein!');
      return;
    }

    const emailAddress = 'mcemotihari.tech@gmail.com';
    const subject = `[${selectedReason}] - ${name.trim()}`;
    const body = `Hello Support Team,

I am raising a support ticket from the MCE Connect App. Here are my ticket details:

- Name: ${name.trim()}
- Email: ${email.trim()}
- Phone: ${phone.trim() || 'Not Provided'}
- Reason: ${selectedReason}

Details & Description:
----------------------
${description.trim()}

----------------------
Sent from MCE Connect App Support Screen.`;

    const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      await Linking.openURL(mailtoUrl);
    } catch (err) {
      // Fallback for simulators or devices with no active mail client
      Alert.alert(
        'Email Client Not Found',
        `Aapke device me koi default mail client setup nahi hai.\n\nKripya direct email karein:\nTo: ${emailAddress}\nSubject: ${subject}\n\nCopy description to clipboard?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'OK', 
            onPress: () => {
              Alert.alert('Success', 'Ticket details are prepared. Copy the text to draft a manual mail.');
            } 
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Dynamic SEO Meta Title Mock for Web builds */}
      {Platform.OS === 'web' && (
        <title>Help & Support Desk - MCE Connect Platform</title>
      )}

      {/* Premium Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: theme.background }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support Desk</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
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
              <Text style={[styles.introTitle, { color: theme.text }]}>How can we help you?</Text>
              <Text style={[styles.introText, { color: theme.textSecondary }]}>
                Apna support query submit karein, humara automated service direct ticket draft compose karega so you can easily dispatch it to our tech desk!
              </Text>
            </View>
          </View>

          {/* Ticket Form Container */}
          <View style={styles.formContainer}>
            
            {/* 1. Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                NAME <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            {/* 2. Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                EMAIL ADDRESS <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                placeholder="e.g. aman@gmail.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* 3. Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                PHONE NUMBER <Text style={{ color: '#64748B' }}>(OPTIONAL)</Text>
              </Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={12}
              />
            </View>

            {/* 4. Reason Dropdown Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                REASON FOR SUPPORT TICKET <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              
              <TouchableOpacity
                style={[styles.dropdownBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                onPress={() => setShowDropdown(!showDropdown)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownBtnText, { color: selectedReason ? theme.text : '#94A3B8' }]}>
                  {selectedReason || 'Choose a support reason'}
                </Text>
                <Ionicons 
                  name={showDropdown ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={theme.textSecondary} 
                />
              </TouchableOpacity>

              {/* Expanding visual selector card */}
              {showDropdown && (
                <View style={[styles.dropdownList, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                  {SUPPORT_REASONS.map((reason, rIdx) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <TouchableOpacity
                        key={rIdx}
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: theme.cardBorder },
                          isSelected && { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.08)' : '#FFF7ED' },
                          rIdx === SUPPORT_REASONS.length - 1 && { borderBottomWidth: 0 }
                        ]}
                        onPress={() => {
                          setSelectedReason(reason);
                          setShowDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dropdownItemText, { color: theme.text }, isSelected && { color: '#F97316', fontWeight: 'bold' }]}>
                          {reason}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#F97316" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 5. Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                DESCRIPTION & DETAILS <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.multilineInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                placeholder="Explain your problem or feedback in detail..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleDraftEmail}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>Compose Email Ticket</Text>
            </TouchableOpacity>

            <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textSecondary, marginTop: -4 }}>
              If client fails to open, copy and email to mcemotihari.tech@gmail.com
            </Text>

          </View>

          {/* Static Support Category Information Panels */}
          <View style={{ gap: 12, marginTop: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 0.6 }}>SUPPORT DIRECTORY & PROCEDURES</Text>
            
            {/* Technical Issues */}
            <View style={[styles.introCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, flexDirection: 'column', alignItems: 'flex-start', padding: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="settings-outline" size={16} color="#F97316" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text }}>Technical Issue Reporting</Text>
              </View>
              <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.textSecondary }}>
                If you encounter login errors, crash freezes, failed picture attachments, or notifications not delivering, please select "Technical Issue" above and describe your mobile OS/browser type. Our dev team will inspect database logs immediately.
              </Text>
            </View>

            {/* Copyright & Takedowns */}
            <View style={[styles.introCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, flexDirection: 'column', alignItems: 'flex-start', padding: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="shield-outline" size={16} color="#F97316" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text }}>Copyright & Content Complaints</Text>
              </View>
              <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.textSecondary }}>
                For copyright takedowns, unauthorized study syllabus reproduction, or sensitive privacy removals, send a formal request containing the exact Post ID or Notice link to our support email. Takedowns are verified and enacted within 24-48 hours.
              </Text>
            </View>

            {/* Collaboration & Contribution */}
            <View style={[styles.introCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, flexDirection: 'column', alignItems: 'flex-start', padding: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="heart-outline" size={16} color="#F97316" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text }}>Alumni & Study Contribution</Text>
              </View>
              <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.textSecondary }}>
                Want to expand study notes, upload exam papers, host technical fests, or offer alumni mentorship webinars? Select "General Inquiry" or email us directly. We welcome active contributions to keep our collegiate community scaling!
              </Text>
            </View>
          </View>

          {/* Typical Response Time and Email Details */}
          <View style={{ alignItems: 'center', marginVertical: 10, gap: 4 }}>
            <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>Response SLA Guarantee</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center', paddingHorizontal: 20 }}>
              Humari core alumni administration team standard support requests ko 24-48 business hours me analyze aur respond karti hai.
            </Text>
          </View>

          {/* Page Footer Navigation Links */}
          <View style={[styles.footerCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 16, borderRadius: 20, borderWidth: 1, gap: 10 }]}>
            <Text style={{ fontSize: 13.5, fontWeight: '900', color: theme.text }}>MCE Connect Legal Hub</Text>
            <View style={{ gap: 8 }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: theme.background }} 
                onPress={() => router.push('/privacy-policy')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F97316' }}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={12} color="#F97316" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flexDirection: 'row', height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: theme.background }} 
                onPress={() => router.push('/terms')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F97316' }}>Terms & Guidelines</Text>
                <Ionicons name="chevron-forward" size={12} color="#F97316" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flexDirection: 'row', height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: theme.background }} 
                onPress={() => router.push('/delete-account')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Delete Account</Text>
                <Ionicons name="chevron-forward" size={12} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, textAlign: 'center', marginTop: 4, fontWeight: '600', color: theme.textSecondary }}>
              Tech Support Desk: <Text style={{ fontWeight: 'bold' }}>mcemotihari.tech@gmail.com</Text>
            </Text>
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 3,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #000` : undefined,

  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  multilineInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '500',
    minHeight: 110,
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
  },
  footerCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    marginTop: 10,
  },
});
