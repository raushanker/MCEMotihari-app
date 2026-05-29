import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { showAppError } from '@/utils/errors/errorManager';
const { width } = Dimensions.get('window');

type FlowStage = 'signin' | 'google_onboard' | 'traditional_login';

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogle, updateAcademicProfile, configurePassword, loginWithEmail, user } = useAuth();
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [isTraditionalLoggingIn, setIsTraditionalLoggingIn] = useState(false);
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  
  // Auth Flow State: 'signin' or 'google_onboard'
  const [flowStage, setFlowStage] = useState<FlowStage>('signin');

  // Input Credentials Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Automatic Onboarding & Redirect Gate for Web Redirect Sign-Ins and general sessions
  useEffect(() => {
    if (user && user.role !== 'Guest') {
      if (user.phone && user.hasPassword) {
        // Already fully onboarded: redirect to Feed directly!
        router.replace('/');
      } else {
        // Authenticated but onboarding incomplete: show profile setup phase
        setEmail(user.email || '');
        setFullName(user.name || '');
        setFlowStage('google_onboard');
      }
    }
  }, [user]);

  // Google Sign-In Action Handler
  const handleGoogleSignIn = async () => {
    setIsGoogleLoggingIn(true);
    const result = await loginWithGoogle();
    setIsGoogleLoggingIn(false);
    
    if (result.success) {
      if (result.isNewUser) {
        // If it's a new user, redirect to onboarding screen to set password/phone/name
        const { auth } = require('../config/firebase');
        const currentUser = auth.currentUser;
        if (currentUser) {
          setEmail(currentUser.email || '');
          setFullName(currentUser.displayName || '');
        }
        setFlowStage('google_onboard');
      } else {
        router.replace('/');
      }
    }
  };

  const handleTraditionalLoginSubmit = async () => {
    const cleanId = email.trim();
    const cleanPass = password;

    if (!cleanId) {
      Alert.alert('Required Field', 'Kripya apna email ya mobile number darj karein.');
      return;
    }
    if (!cleanPass) {
      Alert.alert('Required Field', 'Kripya apna password darj karein.');
      return;
    }

    setIsTraditionalLoggingIn(true);
    const result = await loginWithEmail(cleanId, cleanPass);
    setIsTraditionalLoggingIn(false);

    if (result.success) {
      router.replace('/');
    } else {
      showAppError('Sign In Failed', result.error);
    }
  };

  // Traditional Sign In / Sign Up handler
  const handleAuthSubmit = async () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanPassword = password;

    if (flowStage === 'google_onboard') {
      if (!cleanName) {
        Alert.alert('Required Field', 'Please enter your Full Name.');
        return;
      }
      if (!cleanPhone || cleanPhone.length !== 10 || isNaN(Number(cleanPhone))) {
        Alert.alert('Invalid Input', 'Please enter a valid 10-digit Phone Number.');
        return;
      }
      if (!cleanPassword || cleanPassword.length < 6) {
        Alert.alert('Required Field', 'Password must be at least 6 characters.');
        return;
      }
      
      setIsTraditionalLoggingIn(true);
      
      // Update Name & Phone in Profile
      const updateResult = await updateAcademicProfile(
        'Student', 
        undefined, 
        undefined, 
        undefined, 
        undefined, 
        undefined, 
        undefined, 
        cleanName
      );
      
      // Configure password in Firebase Auth & Phone number in Firestore
      const credentialResult = await configurePassword(cleanPhone, cleanPassword);
      
      setIsTraditionalLoggingIn(false);
      
      if (updateResult.success && credentialResult) {
        Alert.alert('Success 🎉', 'Welcome! Your profile has been created successfully.');
        router.replace('/');
      } else {
        showAppError('Registration Failed', 'Failed to complete registration. Please try again.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
          ) : flowStage === 'traditional_login' ? (
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
                <View style={styles.inputFieldContainer}>
                  <Ionicons name="mail-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter email, username or 10-digit phone"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputFieldContainer}>
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
          ) : (
            <View style={{ marginTop: 10 }}>
              <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 8, borderColor: '#BFDBFE', borderWidth: 1 }}>
                <Text style={{ fontSize: 11, color: '#1E40AF', lineHeight: 15 }}>
                  🎉 Google Sign-in successful! Please complete your registration details below.
                </Text>
              </View>

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputFieldContainer}>
                  <Ionicons name="person-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Aman Kumar"
                    placeholderTextColor="#94A3B8"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email (Locked) */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputFieldContainer, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                  <Ionicons name="mail-outline" size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputField, { color: '#64748B' }]}
                    value={email}
                    editable={false}
                    selectTextOnFocus={false}
                  />
                </View>
              </View>

              {/* Phone Number (Required) */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputFieldContainer}>
                  <Ionicons name="call-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>

              {/* Password (Required, with visibility eye toggle) */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Create Password</Text>
                <View style={styles.inputFieldContainer}>
                  <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputField, { flex: 1 }]}
                    placeholder="Min 6 characters"
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
              </View>

              {/* Action Trigger Submit Button */}
              <TouchableOpacity
                style={[styles.loginSubmitBtn, { marginTop: 15 }]}
                onPress={handleAuthSubmit}
                disabled={isTraditionalLoggingIn}
                activeOpacity={0.85}
              >
                {isTraditionalLoggingIn ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginSubmitBtnText}>Complete Registration</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.infoText}>
            *Sign in allows B.Tech students and alumni to publish announcements, chat, and access verified folders.
          </Text>

          <TouchableOpacity 
            onPress={() => setIsPrivacyVisible(true)} 
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
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
    boxShadow: `${0}px ${8}px ${16}px #0F172A`,

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
