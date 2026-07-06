import React, { useState } from 'react';
import { View, Text, StyleSheet,  ScrollView, TouchableOpacity, Linking, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/hooks/useAuth';
interface TnPNOcScreenProps {
  onBack: () => void;
}

export const TnPNOcScreen: React.FC<TnPNOcScreenProps> = ({ onBack }) => {
  const theme = useThemeColors();
  const isDark = theme.isDark;
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    roll: '',
    registration: '',
    branch: '',
    semester: '',
    batch: '',
    company: '',
    duration: '',
    mode: '',
    contact: ''
  });

  const [isBranchModalVisible, setIsBranchModalVisible] = useState(false);
  const [isSemesterModalVisible, setIsSemesterModalVisible] = useState(false);

  const BRANCHES = ['Civil', 'Civil CA', 'EEE', 'Mech', 'CSE', 'CSE AI'];
  const SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTextChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const requiredFields = ['name', 'roll', 'registration', 'branch', 'semester', 'batch', 'company', 'duration', 'mode'];
    const missing = requiredFields.filter(field => !formData[field as keyof typeof formData].trim());
    if (missing.length > 0) {
      Alert.alert('Incomplete Form', `Please fill out all required fields.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const subject = `Request for NOC for Internship - ${formData.name.trim()} - ${formData.registration.trim()}`;
      
      const body = `Respected Sir,

I am writing to request a No Objection Certificate (NOC) for pursuing an internship. Below are my details:

• Name: ${formData.name.trim()}
• Roll Number: ${formData.roll.trim()}
• Registration Number: ${formData.registration.trim()}
• Branch & Semester: ${formData.branch.trim()} (${formData.semester.trim()} Semester)
• Batch (Passing Year): ${formData.batch.trim()}
• Contact Number: ${formData.contact.trim() || 'Not Provided'}

Internship Details:
• Company/Organization Name: ${formData.company.trim()}
• Duration: ${formData.duration.trim()}
• Mode of Internship: ${formData.mode.trim()}

I have attached my Offer Letter and Resume for your reference.
Kindly issue the NOC so I can proceed with the internship.

Thank you.

Sincerely,
${formData.name.trim()}
`;

      const mailtoUrl = `mailto:tnp.mce@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // We instruct the user BEFORE they are taken to the mail client.
      if (Platform.OS === 'web') {
        window.alert("Important: Please remember to ATTACH your CV and Offer Letter before sending the email.");
        window.open(mailtoUrl, '_blank');
        setIsSubmitting(false);
      } else {
        Alert.alert(
          "Draft Ready",
          "Your email draft has been generated.\n\nIMPORTANT: Please remember to ATTACH your CV and Offer Letter in your email app before sending.",
          [
            { text: "Cancel", style: "cancel", onPress: () => setIsSubmitting(false) },
            { 
              text: "Open Email", 
              onPress: async () => {
                try {
                  const canOpen = await Linking.canOpenURL(mailtoUrl);
                  if (canOpen) {
                    await Linking.openURL(mailtoUrl);
                  } else {
                    Alert.alert('Error', 'Could not open email client. Please ensure you have an email app installed.');
                  }
                } catch (err) {
                  Alert.alert('Error', 'An unexpected error occurred while opening the email client.');
                } finally {
                  setIsSubmitting(false);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  return (
    <>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: theme.background }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
          <TouchableOpacity 
            style={[styles.headerBackBtn, { backgroundColor: isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} 
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Apply for NOC</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.instructionBox}>
            <Ionicons name="information-circle" size={24} color="#0EA5E9" style={{ marginTop: 2 }} />
            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
              Fill out this form to generate an email request for your No Objection Certificate (NOC). The email will be drafted automatically. <Text style={{ fontWeight: 'bold', color: theme.text }}>You must attach your CV and Offer Letter before sending.</Text>
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary + '80'}
                value={formData.name}
                autoCapitalize="words"
                maxLength={60}
                onChangeText={(val) => handleTextChange('name', val)}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Roll Number *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
                  placeholder="e.g. 21CS01"
                  placeholderTextColor={theme.textSecondary + '80'}
                  value={formData.roll}
                  keyboardType="numeric"
                  maxLength={5}
                  onChangeText={(val) => handleTextChange('roll', val.replace(/[^0-9]/g, ''))}
                 autoCapitalize="sentences" />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Registration No *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
                  placeholder="e.g. 211051... "
                  placeholderTextColor={theme.textSecondary + '80'}
                  value={formData.registration}
                  keyboardType="numeric"
                  maxLength={11}
                  onChangeText={(val) => handleTextChange('registration', val.replace(/[^0-9]/g, ''))}
                 autoCapitalize="sentences" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Branch *</Text>
                <TouchableOpacity 
                  style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, justifyContent: 'center' }]}
                  onPress={() => setIsBranchModalVisible(true)}
                >
                  <Text style={{ color: formData.branch ? theme.text : (theme.textSecondary + '80'), fontSize: 15 }}>
                    {formData.branch || 'Select Branch'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textSecondary} style={{ position: 'absolute', right: 12 }} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Semester *</Text>
                <TouchableOpacity 
                  style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, justifyContent: 'center' }]}
                  onPress={() => setIsSemesterModalVisible(true)}
                >
                  <Text style={{ color: formData.semester ? theme.text : (theme.textSecondary + '80'), fontSize: 15 }}>
                    {formData.semester || 'Select Sem'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textSecondary} style={{ position: 'absolute', right: 12 }} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Batch *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
                  placeholder="e.g. 2021-2025"
                  placeholderTextColor={theme.textSecondary + '80'}
                  value={formData.batch}
                  maxLength={9}
                  onChangeText={(val) => handleTextChange('batch', val)}
                 autoCapitalize="sentences" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Contact Number (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.textSecondary + '80'}
                keyboardType="phone-pad"
                value={formData.contact}
                maxLength={15}
                onChangeText={(val) => handleTextChange('contact', val.replace(/[^0-9+]/g, ''))}
               autoCapitalize="sentences" />
            </View>

            <View style={styles.divider} />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Internship Details</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Company / Organization Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
                placeholder="Enter company name"
                placeholderTextColor={theme.textSecondary + '80'}
                value={formData.company}
                maxLength={100}
                autoCapitalize="words"
                onChangeText={(val) => handleTextChange('company', val)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Duration *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
                placeholder="e.g. 1st June 2024 to 31st July 2024"
                placeholderTextColor={theme.textSecondary + '80'}
                value={formData.duration}
                maxLength={50}
                autoCapitalize="sentences"
                onChangeText={(val) => handleTextChange('duration', val)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Mode of Internship *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.cardBorder }]}
                placeholder="e.g. Online / Offline / Hybrid"
                placeholderTextColor={theme.textSecondary + '80'}
                value={formData.mode}
                maxLength={20}
                autoCapitalize="sentences"
                onChangeText={(val) => handleTextChange('mode', val)}
              />
            </View>
            
            <View style={{ height: 24 }} />

            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: theme.primary }, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Generate Email Draft</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Branch Modal */}
      <Modal visible={isBranchModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsBranchModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Branch</Text>
            {BRANCHES.map(b => (
              <TouchableOpacity 
                key={b} 
                style={[styles.modalOption, { borderBottomColor: theme.cardBorder }]}
                onPress={() => {
                  handleTextChange('branch', b);
                  setIsBranchModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: formData.branch === b ? theme.primary : theme.text }]}>{b}</Text>
                {formData.branch === b && <Ionicons name="checkmark" size={20} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Semester Modal */}
      <Modal visible={isSemesterModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsSemesterModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Semester</Text>
            {SEMESTERS.map(s => (
              <TouchableOpacity 
                key={s} 
                style={[styles.modalOption, { borderBottomColor: theme.cardBorder }]}
                onPress={() => {
                  handleTextChange('semester', s);
                  setIsSemesterModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: formData.semester === s ? theme.primary : theme.text }]}>{s}</Text>
                {formData.semester === s && <Ionicons name="checkmark" size={20} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  instructionBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  instructionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  formContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
