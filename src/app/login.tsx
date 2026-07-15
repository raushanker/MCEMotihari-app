import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, ActivityIndicator,  KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { showAppError } from '@/utils/errors/errorManager';
import { validatePassword } from '@/utils/passwordValidator';
import { PasswordHelperText } from '@/components/ui/PasswordHelperText';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
const { width } = Dimensions.get('window');

type FlowStage = 'signin' | 'traditional_login';

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogle, loginWithEmail, user } = useAuth();
  const { stage } = useLocalSearchParams<{ stage?: string }>();
  
  // Synchronous locks to prevent rapid double-taps crashing / duplicating requests
  const isActionLocked = React.useRef(false);

  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [isTraditionalLoggingIn, setIsTraditionalLoggingIn] = useState(false);
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  
  // Auth Flow State: 'signin' or 'traditional_login'
  const [flowStage, setFlowStage] = useState<FlowStage>('signin');

  useEffect(() => {
    if (stage === 'traditional_login') {
      setFlowStage('traditional_login');
    }
  }, [stage]);

  // Input Credentials Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Automatic Redirect Gate for Web Redirect Sign-Ins and general sessions
  useEffect(() => {
    if (user && user.uid) {
      router.replace('/');
    }
  }, [user]);

  // Google Sign-In Action Handler
  const handleGoogleSignIn = async () => {
    if (isActionLocked.current) return;
    isActionLocked.current = true;
    setIsGoogleLoggingIn(true);
    const result = await loginWithGoogle();
    setIsGoogleLoggingIn(false);
    isActionLocked.current = false;
    
    if (result.success) {
      router.replace('/');
    }
  };

  const handleTraditionalLoginSubmit = async () => {
    if (isActionLocked.current) return;
    
    const cleanId = email.trim();
    const cleanPass = password;

    setEmailError('');
    setPasswordError('');

    if (!cleanId) {
      setEmailError('Please enter your email or phone number.');
      return;
    }
    if (!cleanPass) {
      setPasswordError('Please enter your password.');
      return;
    }

    isActionLocked.current = true;
    setIsTraditionalLoggingIn(true);
    const result = await loginWithEmail(cleanId, cleanPass);
    setIsTraditionalLoggingIn(false);
    isActionLocked.current = false;

    if (result.success) {
      router.replace('/');
    } else {
      showAppError('Sign In Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: Platform.OS === 'android' ? 240 : 120 }]} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        bounces={false}
      >
        {/* Background Neon Orbs */}
        <View style={styles.glowOrb1} />
        <View style={styles.glowOrb2} />

        {/* Header section */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/images/mce-logo.png')} // College Seal
            style={styles.logo}
          />
          <Text style={styles.collegeName}>MCE Motihari</Text>
          <Text style={styles.appSubtitle}>Motihari College of Engineering</Text>
        </View>

        {/* Glassmorphic Box */}
        <View style={styles.glassCard}>
          {/* Dynamic Titles based on Stage */}
          <Text style={styles.cardTitle}>
            {flowStage === 'signin' ? 'MCE Digital Campus' : flowStage === 'traditional_login' ? 'MCE User Sign In' : 'Complete Profile'}
          </Text>
          <Text style={styles.cardSubTitle}>
            {flowStage === 'signin' ? '— WELCOME —' : flowStage === 'traditional_login' ? '— LOGIN TO ACCESS PORTAL —' : '— CHOOSE YOUR NAME, PHONE & PASSWORD —'}
          </Text>

          {flowStage === 'signin' ? (
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <Text style={styles.stepNotice}>
                Welcome to MCE Motihari digital campus portal. Connect seamlessly using your Google Account to access notices, forums, and connect with peers.
              </Text>

              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={[styles.googleBrandBtn, { width: '100%', marginTop: 10 }]}
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoggingIn}
                activeOpacity={0.85}
              >
                {isGoogleLoggingIn ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Image
                      source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1024px-Google_%22G%22_logo.svg.png' }}
                      style={styles.googleIcon}
                    />
                    <Text style={styles.googleBrandBtnText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Already a user? Login option */}
              <TouchableOpacity
                style={{
                  marginTop: 20,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => {
                  setEmail('');
                  setPassword('');
                  setFlowStage('traditional_login');
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
                  Already a user? <Text style={{ color: '#F97316', fontWeight: 'bold' }}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
              {/* Back Button */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
                onPress={() => setFlowStage('signin')}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={16} color="#64748B" />
                <Text style={{ fontSize: 12.5, color: '#64748B', marginLeft: 4, fontWeight: '600' }}>Go Back</Text>
              </TouchableOpacity>

              {/* Identifier Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email, Username or Phone Number</Text>
                <View style={[styles.inputFieldContainer, emailError ? { borderColor: '#EF4444' } : null]}>
                  <Ionicons name="mail-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter email, username or 10-digit phone"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={text => { setEmail(text); setEmailError(''); }}
                    autoCapitalize="none"
                  />
                </View>
                {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputFieldContainer, passwordError ? { borderColor: '#EF4444' } : null]}>
                  <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputField, { flex: 1 }]}
                    placeholder="Enter password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={{ paddingHorizontal: 10 }}>
                    <Ionicons name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={{ alignSelf: 'flex-end', marginTop: 8 }}
                  onPress={() => router.push('/forgot-password')}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12.5, color: '#F97316', fontWeight: '600' }}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.loginSubmitBtn, { marginTop: 15 }]}
                onPress={handleTraditionalLoginSubmit}
                disabled={isTraditionalLoggingIn}
                activeOpacity={0.85}
              >
                {isTraditionalLoggingIn ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginSubmitBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.infoText}>
            *Sign in allows B.Tech students and alumni to publish announcements, chat, and access verified folders.
          </Text>

          <TouchableOpacity 
            onPress={() => router.push('/privacy-policy')} 
            style={styles.privacyLinkContainer}
            activeOpacity={0.7}
          >
            <Text style={styles.privacyLinkText}>
              Privacy & Platform Policies
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PrivacyModal
        visible={isPrivacyVisible}
        onClose={() => setIsPrivacyVisible(false)}
      />
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
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F97316',
  },
  collegeName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  glassCard: {
    width: width - 48,
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'stretch',
    boxShadow: Platform.OS === 'web' ? `${0}px ${8}px ${16}px #0F172A` : undefined,

    elevation: 3,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  stepNotice: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  inputContainer: {
    marginBottom: 14,
  },
  errorText: { fontSize: 10.5, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    paddingLeft: 2,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },
  loginSubmitBtn: {
    backgroundColor: '#F97316',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  googleBrandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4285F4',
    paddingHorizontal: 16,
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
    backgroundColor: '#FFF',
    borderRadius: 9,
  },
  googleBrandBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  infoText: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  privacyLinkContainer: {
    alignSelf: 'center',
    marginTop: 12,
  },
  privacyLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3B82F6',
  },
});
