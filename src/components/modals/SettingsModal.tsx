import React, { useState } from 'react';
import {Platform, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Share} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailModal } from './DetailModal';
import { useAppStore } from '@/store/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onTriggerPassword?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onTriggerLogout?: () => void;
  onTriggerDeleteProfile?: () => void;
}

export function SettingsModal({ 
  visible, 
  onClose, 
  onTriggerPassword, 
  onOpenAbout, 
  onOpenPrivacy,
  onTriggerLogout,
  onTriggerDeleteProfile
}: SettingsModalProps) {
  const { user } = useAuth();
  const theme = useThemeColors();
  const {
    themePreference,
    setThemePreference,
    pushNoticesEnabled,
    setPushNoticesEnabled,
    pushClapsEnabled,
    setPushClapsEnabled,
    dataSaverEnabled,
    setDataSaverEnabled,
    clearAppCache,
    fetchNotices,
    fetchUniversityNotices
  } = useAppStore();

  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAppCache();
      // Reload silently from online backend
      await Promise.all([
        fetchNotices(true).catch(() => {}),
        fetchUniversityNotices(true).catch(() => {})
      ]);
      Alert.alert('Cache Cleared', 'Successfully cleaned cached notices and re-synced fresh feeds from MCE and BEU portals.');
    } catch (e) {
      console.warn(e);
    } finally {
      setIsClearing(false);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'MCE Connect App',
        message: 'Hey MCEians! 👋\nMotihari College of Engineering (MCE) Connect app is finally here! 🚀\nRead official notices, download academic syllabus & study materials, view calendars, and network with students & alumni. 🎓\n\nDownload now on Play Store:\n🔗 https://play.google.com/store/apps/details?id=mcemotihari.app',
      });
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <DetailModal visible={visible} title="App Settings" onClose={onClose}>
      {/* 1. Theme Configuration */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance Preference</Text>
      
      <View style={styles.preferenceContainer}>
        <TouchableOpacity
          style={[styles.preferenceBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }, themePreference === 'light' && styles.preferenceBtnActive]}
          onPress={() => setThemePreference('light')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="sunny" 
            size={16} 
            color={themePreference === 'light' ? '#FFFFFF' : theme.textSecondary} 
            style={{ marginBottom: 4 }}
          />
          <Text style={[styles.preferenceText, { color: theme.textSecondary }, themePreference === 'light' && styles.preferenceTextActive]}>
            Light
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.preferenceBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }, themePreference === 'dark' && styles.preferenceBtnActive]}
          onPress={() => setThemePreference('dark')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="moon" 
            size={16} 
            color={themePreference === 'dark' ? '#FFFFFF' : theme.textSecondary} 
            style={{ marginBottom: 4 }}
          />
          <Text style={[styles.preferenceText, { color: theme.textSecondary }, themePreference === 'dark' && styles.preferenceTextActive]}>
            Dark
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.preferenceBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }, themePreference === 'system' && styles.preferenceBtnActive]}
          onPress={() => setThemePreference('system')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="phone-portrait" 
            size={16} 
            color={themePreference === 'system' ? '#FFFFFF' : theme.textSecondary} 
            style={{ marginBottom: 4 }}
          />
          <Text style={[styles.preferenceText, { color: theme.textSecondary }, themePreference === 'system' && styles.preferenceTextActive]}>
            System
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Notification Configuration */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Notification Triggers</Text>
      
      <TouchableOpacity 
        style={[styles.settingsRow, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
        onPress={() => setPushNoticesEnabled(!pushNoticesEnabled)}
        activeOpacity={0.8}
      >
        <View style={styles.rowLabelGroup}>
          <Ionicons name="notifications-outline" size={18} color="#F97316" style={{ marginRight: 10 }} />
          <Text style={[styles.settingsLabel, { color: theme.text }]}>Push notice updates</Text>
        </View>
        <Ionicons 
          name={pushNoticesEnabled ? "checkbox" : "square-outline"} 
          size={20} 
          color="#F97316" 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.settingsRow, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
        onPress={() => setPushClapsEnabled(!pushClapsEnabled)}
        activeOpacity={0.8}
      >
        <View style={styles.rowLabelGroup}>
          <Ionicons name="heart-outline" size={18} color="#F97316" style={{ marginRight: 10 }} />
          <Text style={[styles.settingsLabel, { color: theme.text }]}>Upvote claps alerts</Text>
        </View>
        <Ionicons 
          name={pushClapsEnabled ? "checkbox" : "square-outline"} 
          size={20} 
          color="#F97316" 
        />
      </TouchableOpacity>

      {/* 3. Data Saver Configuration */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Network Usage Saver</Text>
      <TouchableOpacity 
        style={[styles.settingsRow, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
        onPress={() => setDataSaverEnabled(!dataSaverEnabled)}
        activeOpacity={0.8}
      >
        <View style={styles.rowLabelGroup}>
          <Ionicons name="leaf-outline" size={18} color="#F97316" style={{ marginRight: 10 }} />
          <Text style={[styles.settingsLabel, { color: theme.text }]}>Data Saver Mode</Text>
        </View>
        <Ionicons 
          name={dataSaverEnabled ? "checkbox" : "square-outline"} 
          size={20} 
          color="#F97316" 
        />
      </TouchableOpacity>

      {/* 4. Advanced Maintenance Utilities */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Advanced Utilities</Text>

      <TouchableOpacity 
        style={[styles.settingsRow, styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
        onPress={handleShareApp}
        activeOpacity={0.8}
      >
        <View style={styles.rowLabelGroup}>
          <Ionicons name="share-social-outline" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
          <Text style={[styles.settingsLabel, { color: theme.text }]}>Share Connect App</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.settingsRow, styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
        onPress={handleClearCache}
        disabled={isClearing}
        activeOpacity={0.8}
      >
        <View style={styles.rowLabelGroup}>
          {isClearing ? (
            <ActivityIndicator size="small" color="#F97316" style={{ marginRight: 10 }} />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
          )}
          <Text style={[styles.settingsLabel, { color: isClearing ? theme.textSecondary : '#EF4444' }]}>
            {isClearing ? 'Clearing notice cache...' : 'Clear Cached Announcements'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </TouchableOpacity>

      {onOpenAbout && (
        <TouchableOpacity 
          style={[styles.settingsRow, styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
          onPress={onOpenAbout}
          activeOpacity={0.8}
        >
          <View style={styles.rowLabelGroup}>
            <Ionicons name="information-circle-outline" size={18} color="#4F46E5" style={{ marginRight: 10 }} />
            <Text style={[styles.settingsLabel, { color: theme.text }]}>About MCE Motihari</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>
      )}

      {onOpenPrivacy && (
        <TouchableOpacity 
          style={[styles.settingsRow, styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
          onPress={onOpenPrivacy}
          activeOpacity={0.8}
        >
          <View style={styles.rowLabelGroup}>
            <Ionicons name="shield-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
            <Text style={[styles.settingsLabel, { color: theme.text }]}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>
      )}

      {/* 5. Account Security */}
      {user && user.role !== 'Guest' && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Security</Text>
          <TouchableOpacity 
            style={[styles.settingsRow, styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
            onPress={() => {
              onClose();
              if (onTriggerPassword) onTriggerPassword();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="settings-outline" size={18} color="#F97316" style={{ marginRight: 10 }} />
              <Text style={[styles.settingsLabel, { color: theme.text }]}>
                Login Setting
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingsRow, styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
            onPress={() => {
              onClose();
              if (onTriggerLogout) onTriggerLogout();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={[styles.settingsLabel, { color: '#EF4444' }]}>
                Sign Out from Account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingsRow, styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
            onPress={() => {
              onClose();
              if (onTriggerDeleteProfile) onTriggerDeleteProfile();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={[styles.settingsLabel, { color: '#EF4444' }]}>
                Account delete request
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </>
      )}

      {/* Build Details */}
      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Build Version Details</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        MCE Motihari Connect App is built using React Native 0.81, Expo SDK 54, and styled using standard Material 3 spacing and contrast guidelines. Developed for academic networking.
      </Text>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  richTextParagraph: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionRow: {
    backgroundColor: '#FFFFFF',
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  
  // Theme Preference styling
  preferenceContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  preferenceBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceBtnActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
    boxShadow: Platform.OS === 'web' ? `${0}px ${3}px ${4}px #F97316` : undefined,

    elevation: 2,
  },
  preferenceText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#475569',
  },
  preferenceTextActive: {
    color: '#FFFFFF',
  },
});

export default SettingsModal;
