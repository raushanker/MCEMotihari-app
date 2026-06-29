import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function NotificationPermissionModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasDeniedPreviously, setHasDeniedPreviously] = useState(false);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  useEffect(() => {
    checkPermissionPrompt();
  }, []);

  const checkPermissionPrompt = async () => {
    if (Platform.OS === 'web') return; // Web typically has its own prompt logic
    
    try {
      const status = await AsyncStorage.getItem('@mce_notif_prompt_status');
      const lastPromptTime = await AsyncStorage.getItem('@mce_notif_prompt_time');
      
      const now = Date.now();
      
      if (status === 'allowed') {
        return; // Never ask again
      }
      
      if (status === 'denied') {
        setHasDeniedPreviously(true);
        // We only show it again if they explicitly trigger something requiring it, 
        // but for now, if it's 'denied', we won't pop it up randomly. 
        return;
      }
      
      if (status === 'later' && lastPromptTime) {
        const timePassed = now - parseInt(lastPromptTime, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (timePassed < sevenDays) {
          return; // Don't show if 7 days haven't passed
        }
      }
      
      // If we reach here, either first launch or 7 days passed since "Maybe Later"
      setIsVisible(true);
      
    } catch (e) {
      console.warn('Error checking notification prompt status:', e);
    }
  };

  const savePromptState = async (status: 'allowed' | 'later' | 'denied') => {
    try {
      await AsyncStorage.setItem('@mce_notif_prompt_status', status);
      await AsyncStorage.setItem('@mce_notif_prompt_time', Date.now().toString());
    } catch (e) {
      console.warn('Failed to save prompt state', e);
    }
  };

  const handleAllow = async () => {
    if (hasDeniedPreviously) {
      // If they denied before, the native prompt won't show again, they must go to settings
      Linking.openSettings();
      setIsVisible(false);
      return;
    }

    try {
      const { requestPermissionsAsync, getPermissionsAsync } = require('expo-notifications');
      
      // First check existing status
      const { status: existingStatus } = await getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        await savePromptState('allowed');
        // Register token immediately
        const { registerAndSavePushToken } = require('@/utils/notifications');
        const { useAppStore } = require('@/store/useAppStore');
        const user = useAppStore.getState().user;
        if (user && user.uid && user.role !== 'Guest') {
          registerAndSavePushToken(user.uid);
        } else {
          registerAndSavePushToken('guest');
        }
        setIsVisible(false);
        return;
      }

      // Request new permission
      const { status } = await requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      
      if (status === 'granted') {
        await savePromptState('allowed');
        // Register token immediately
        const { registerAndSavePushToken } = require('@/utils/notifications');
        const { useAppStore } = require('@/store/useAppStore');
        const user = useAppStore.getState().user;
        if (user && user.uid && user.role !== 'Guest') {
          registerAndSavePushToken(user.uid);
        } else {
          registerAndSavePushToken('guest');
        }
      } else {
        await savePromptState('denied');
        setHasDeniedPreviously(true);
      }
    } catch (notifErr) {
      console.warn('Failed to request native notifications:', notifErr);
    } finally {
      setIsVisible(false);
    }
  };

  const handleMaybeLater = async () => {
    await savePromptState('later');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="fade" transparent>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15,23,42,0.7)' }]}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={[styles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications" size={36} color="#F97316" />
            </View>
            
            <Text style={[styles.title, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              Stay Connected!
            </Text>
            
            <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#475569' }]}>
              {hasDeniedPreviously 
                ? 'You previously denied notifications. Enable them in Settings to receive:'
                : 'We would like to send you important alerts for:'}
            </Text>
            
            <View style={styles.list}>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                <Text style={[styles.listText, { color: isDark ? '#CBD5E1' : '#334155' }]}>Connection Requests</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                <Text style={[styles.listText, { color: isDark ? '#CBD5E1' : '#334155' }]}>Important College Notices</Text>
              </View>
              <View style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                <Text style={[styles.listText, { color: isDark ? '#CBD5E1' : '#334155' }]}>Post Interactions & Mentions</Text>
              </View>
            </View>
            
            <View style={[styles.btnRow, { flexDirection: isNarrow ? 'column-reverse' : 'row' }]}>
              <TouchableOpacity 
                style={[styles.btn, styles.btnSecondary, { borderColor: isDark ? '#334155' : '#E2E8F0' }, isNarrow ? { width: '100%', marginTop: 12 } : { flex: 1 }]} 
                onPress={handleMaybeLater}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnTextSecondary, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1} adjustsFontSizeToFit>
                  Maybe Later
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btn, styles.btnPrimary, isNarrow ? { width: '100%' } : { flex: 1, marginLeft: 12 }]} 
                onPress={handleAllow}
                activeOpacity={0.8}
              >
                <Text style={styles.btnTextPrimary} numberOfLines={1} adjustsFontSizeToFit>
                  {hasDeniedPreviously ? 'Open Settings' : 'Allow Notifications'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  list: {
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  listText: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  btnRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  btnPrimary: {
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnTextSecondary: {
    fontSize: 16,
    fontWeight: '700',
  },
  btnTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
