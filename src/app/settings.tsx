import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, Switch,  ActivityIndicator, Alert } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isDark = theme.isDark;

  const {
    themePreference,
    setThemePreference,
    dataSaverEnabled,
    setDataSaverEnabled,
    pushNoticesEnabled,
    setPushNoticesEnabled,
    setShouldOpenEditProfile,
    setShouldOpenLoginSettings
  } = useAppStore();

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { user, saveLoginSettings, checkUsernameAvailability, validateUsername } = useAuth();
  
  const showToast = useAppStore(state => state.showToast);
  const isUsernameLocked = useMemo(() => {
    if (!user?.usernameLastChangedAt) return false;
    const lastChanged = new Date(user.usernameLastChangedAt).getTime();
    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
    return (Date.now() - lastChanged) < fourteenDaysInMs;
  }, [user?.usernameLastChangedAt]);

  const usernameLockRemainingText = useMemo(() => {
    if (!user?.usernameLastChangedAt) return '';
    const lastChanged = new Date(user.usernameLastChangedAt).getTime();
    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
    const timeDiff = Date.now() - lastChanged;
    if (timeDiff >= fourteenDaysInMs) return '';
    
    const remainingDays = Math.ceil((fourteenDaysInMs - timeDiff) / (24 * 60 * 60 * 1000));
    const nextAvailableDate = new Date(lastChanged + fourteenDaysInMs);
    return `Locked: Next change in ${remainingDays} days (${nextAvailableDate.toLocaleDateString()})`;
  }, [user?.usernameLastChangedAt]);

  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingLogin, setIsSavingLogin] = useState(false);

  const [usernameAvailability, setUsernameAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'too_short'>('idle');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { text: '', color: 'transparent' };
    if (pass.length < 6) return { text: 'Weak', color: '#EF4444' };
    if (pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) return { text: 'Strong', color: '#10B981' };
    return { text: 'Good', color: '#F59E0B' };
  };

  const passwordStrength = getPasswordStrength(password);
  React.useEffect(() => {
    if (user) {
      if (user.username && !username) setUsername(user.username);
      if (user.phone && !phone) setPhone(user.phone);
    }
  }, [user]);

  React.useEffect(() => {
    if (isUsernameLocked || !username) {
      setUsernameAvailability('idle');
      return;
    }
    
    if (username.toLowerCase() === user?.username?.toLowerCase()) {
      setUsernameAvailability('idle');
      return;
    }

    const validationError = validateUsername(username);
    if (validationError) {
      setUsernameAvailability('too_short');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setUsernameAvailability('checking');
    const timer = setTimeout(async () => {
      if (abortController.signal.aborted) return;
      try {
        const isAvailable = await checkUsernameAvailability(username);
        if (abortController.signal.aborted) return;
        if (isAvailable) {
          setUsernameAvailability('available');
        } else {
          setUsernameAvailability('taken');
        }
      } catch (e) {
        if (!abortController.signal.aborted) setUsernameAvailability('idle');
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [username, isUsernameLocked, user]);

  const isSaveDisabled = 
    !username || 
    !phone || 
    (username.toLowerCase() === user?.username?.toLowerCase() && phone === user?.phone && !password) ||
    usernameAvailability === 'checking' || 
    usernameAvailability === 'taken' || 
    usernameAvailability === 'too_short' ||
    saveState === 'saving' || 
    saveState === 'saved';

  const handleSaveLogin = async () => {
    if (isSaveDisabled) return;
    
    setSaveState('saving');
    try {
      const result = await saveLoginSettings(username, phone, password);
      
      if (!result.success) {
        setSaveState('idle');
        Alert.alert('Error', result.error || 'Failed to update login settings');
        showToast(result.error || 'Update failed', 'error');
      } else {
        setSaveState('saved');
        showToast('Login Settings updated successfully!', 'success');
        setPassword('');
        setTimeout(() => setSaveState('idle'), 2000); // Reset animation after 2s
      }
    } catch (e: any) {
      setSaveState('idle');
      Alert.alert('Error', e.message);
      showToast('A network error occurred.', 'error');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleSupport = () => {
    router.push('/support');
  };

  const renderSectionHeader = (title: string, icon: any, key: string, isExpandable = false) => (
    <TouchableOpacity 
      style={[styles.sectionHeader, { borderBottomColor: theme.cardBorder }]}
      onPress={() => isExpandable ? toggleSection(key) : null}
      activeOpacity={isExpandable ? 0.7 : 1}
    >
      <View style={styles.sectionHeaderLeft}>
        <Ionicons name={icon} size={20} color={theme.text} style={{ marginRight: 12 }} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {isExpandable && (
        <Ionicons 
          name={expandedSection === key ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={theme.textSecondary} 
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* 1. Account Settings */}
        {user?.role !== 'Guest' && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            {renderSectionHeader('Login Settings', 'lock-closed-outline', 'login-settings', true)}
            
            {expandedSection === 'login-settings' && (
              <View style={{ padding: 16, paddingTop: 0, gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' }}>Username</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isUsernameLocked ? theme.backgroundElement : theme.background, borderColor: theme.cardBorder, color: isUsernameLocked ? theme.textSecondary : theme.text }]}
                    placeholder="Username"
                    placeholderTextColor="#94A3B8"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    editable={!isUsernameLocked}
                  />
                  {!isUsernameLocked && (
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4, marginLeft: 4 }}>
                      Note: Username can only be changed once every 14 days.
                    </Text>
                  )}
                  {usernameAvailability === 'checking' && (
                    <Text style={{ fontSize: 12, color: '#F59E0B', marginTop: 4, marginLeft: 4 }}>Checking availability...</Text>
                  )}
                  {usernameAvailability === 'available' && (
                    <Text style={{ fontSize: 12, color: '#10B981', marginTop: 4, marginLeft: 4 }}>✓ Username is available</Text>
                  )}
                  {usernameAvailability === 'taken' && (
                    <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 }}>✗ Username is already taken</Text>
                  )}
                  {usernameAvailability === 'too_short' && (
                    <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 }}>! Username must be at least 5 characters</Text>
                  )}
                  {isUsernameLocked && (
                    <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 6, marginLeft: 4 }}>
                      {usernameLockRemainingText}
                    </Text>
                  )}
                </View>
                
                <View>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' }}>Phone Number (10 digits)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderColor: theme.cardBorder, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: '500', marginRight: 8 }}>+91</Text>
                    <TextInput
                      style={{ flex: 1, paddingVertical: 14, fontSize: 16, color: theme.text }}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor="#94A3B8"
                      value={phone}
                      onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, '').slice(0, 10))}
                      keyboardType="phone-pad"
                      maxLength={10}
                     autoCapitalize="sentences" />
                  </View>
                </View>
                
                <View>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' }}>
                    {user?.hasPassword ? 'Change Password (leave empty to keep current)' : 'Set Password'}
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text, paddingRight: 40 }]}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                     autoCapitalize="sentences" />
                    <TouchableOpacity 
                      style={{ position: 'absolute', right: 12, top: 12 }} 
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      Eg.- Pass@24
                    </Text>
                    {password.length > 0 && (
                      <Text style={{ fontSize: 11, color: passwordStrength.color, fontWeight: '600' }}>
                        {passwordStrength.text}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: saveState === 'saved'
                      ? '#10B981'
                      : isSaveDisabled
                        ? (isDark ? '#1E3A8A' : '#93C5FD')
                        : '#3B82F6',
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    marginTop: 8
                  }}
                  onPress={handleSaveLogin}
                  disabled={isSaveDisabled}
                >
                  {saveState === 'saving' ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : saveState === 'saved' ? (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Saved!</Text>
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save Login Settings</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 2. Preferences */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          {renderSectionHeader('Preferences', 'options-outline', 'preferences', true)}
          
          {(expandedSection === 'preferences' || expandedSection === null) && (
            <View>
              {/* Appearance */}
              <View style={[styles.row, { borderBottomColor: theme.cardBorder }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="color-palette-outline" size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
                  <Text style={[styles.rowText, { color: theme.text }]}>Appearance</Text>
                </View>
                <View style={styles.segmentedControl}>
                  {(['system', 'light', 'dark'] as const).map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.segmentBtn,
                        themePreference === mode && [styles.segmentBtnActive, { backgroundColor: isDark ? '#3B82F6' : '#2563EB' }]
                      ]}
                      onPress={() => setThemePreference(mode)}
                    >
                      <Text style={[
                        styles.segmentText, 
                        { color: themePreference === mode ? '#FFFFFF' : theme.textSecondary }
                      ]}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Data Saver */}
              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="leaf-outline" size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={[styles.rowText, { color: theme.text }]}>Data Saver Mode</Text>
                    <Text style={[styles.rowSubText, { color: theme.textSecondary }]}>Reduces network usage</Text>
                  </View>
                </View>
                <Switch
                  value={dataSaverEnabled}
                  onValueChange={setDataSaverEnabled}
                  trackColor={{ false: theme.cardBorder, true: '#3B82F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}
        </View>

        {/* 3. Notifications */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          {renderSectionHeader('Notifications', 'notifications-outline', 'notifications', true)}
          
          {expandedSection === 'notifications' && (
              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="megaphone-outline" size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
                  <Text style={[styles.rowText, { color: theme.text }]}>Push Notices</Text>
                </View>
                <Switch
                  value={pushNoticesEnabled}
                  onValueChange={async (val) => {
                    if (val) {
                       try {
                        const { requestPermissionsAsync } = require('expo-notifications');
                        await requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
                       } catch (e) {}
                    }
                    setPushNoticesEnabled(val);
                  }}
                  trackColor={{ false: theme.cardBorder, true: '#3B82F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
          )}
        </View>

        {/* 4. Support */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          {renderSectionHeader('Support', 'help-circle-outline', 'support')}
          
          <TouchableOpacity 
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={handleSupport}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="chatbubbles-outline" size={18} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.rowText, { color: theme.text }]}>Contact Support</Text>
                <Text style={[styles.rowSubText, { color: theme.textSecondary }]}>Get help with your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  }
});
