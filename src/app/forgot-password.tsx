import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { showAppError } from '@/utils/errors/errorManager';
import { app } from '@/config/firebase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResetPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showAppError('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = getAuth(app);
      // Firebase Hosting handles the UI by default.
      await sendPasswordResetEmail(auth, cleanEmail);
      setIsSuccess(true);
    } catch (error: any) {
      showAppError('Reset Failed', error.message || 'Could not send reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Background Neon Orbs */}
        <View style={styles.glowOrb1} />
        <View style={styles.glowOrb2} />

        {/* Header section */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/images/mce-logo.png')}
            style={styles.logo}
          />
          <Text style={styles.collegeName}>MCE Motihari</Text>
        </View>

        {/* Glassmorphic Box */}
        <View style={styles.glassCard}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#64748B" />
            <Text style={{ fontSize: 13, color: '#64748B', marginLeft: 6, fontWeight: '600' }}>Back to Login</Text>
          </TouchableOpacity>

          <Text style={styles.cardTitle}>Reset Password</Text>
          
          {isSuccess ? (
            <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
              <View style={styles.successIconBox}>
                <Ionicons name="mail-open-outline" size={32} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Check Your Inbox</Text>
              <Text style={styles.successBody}>
                We have sent a password reset link to <Text style={{fontWeight: 'bold', color: '#1E293B'}}>{email}</Text>. Please check your email to create a new password.
              </Text>
              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: 30, width: '100%' }]}
                onPress={() => router.replace('/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Return to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.cardSubTitle}>
                Enter the email address associated with your account, and we will send you a link to reset your password.
              </Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Registered Email</Text>
                <View style={styles.inputFieldContainer}>
                  <Ionicons name="mail-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="student@mcemotihari.ac.in"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleResetPassword}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 120,
  },
  glowOrb1: {
    position: 'absolute',
    top: 30,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(249, 115, 22, 0.04)',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: 30,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 16,
    borderRadius: 20,
  },
  collegeName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardSubTitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 8,
  },
  successBody: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  }
});
