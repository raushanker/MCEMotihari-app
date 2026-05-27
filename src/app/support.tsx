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
      
      {/* Premium Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: theme.background }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Contact Tech Support</Text>
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
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>

            <Text style={{ textAlign: 'center', fontSize: 11, color: theme.textSecondary, marginTop: -4 }}>
              If not working, direct mail us at mcemotihari.tech@gmail.com
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
    boxShadow: `${0}px ${2}px ${4}px #000`,

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
    boxShadow: `${0}px ${4}px ${8}px #000`,

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
    boxShadow: `${0}px ${4}px ${8}px #F97316`,

    elevation: 4,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
