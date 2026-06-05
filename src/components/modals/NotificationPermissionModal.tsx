import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

export function NotificationPermissionModal() {
  const [isVisible, setIsVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  useEffect(() => {
    checkPermissionPrompt();
  }, []);

  const checkPermissionPrompt = async () => {
    try {
      const prompted = await AsyncStorage.getItem('@mce_notif_prompted');
      if (!prompted) {
        setIsVisible(true);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAllow = async () => {
    try {
      await AsyncStorage.setItem('@mce_notif_prompted', 'true');
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        try {
          const { requestPermissionsAsync } = require('expo-notifications');
          await requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
          });
        } catch (notifErr) {
          console.warn('Failed to request native notifications:', notifErr);
        }
      } else if (Platform.OS === 'web') {
        if ('Notification' in window) {
          try {
            await Notification.requestPermission();
          } catch (webErr) {
            console.warn('Failed to request web notifications:', webErr);
          }
        }
      }
      setIsVisible(false);
    } catch (e) {
      console.warn(e);
      setIsVisible(false);
    }
  };

  const handleDeny = async () => {
    try {
      await AsyncStorage.setItem('@mce_notif_prompted', 'true');
      setIsVisible(false);
    } catch (e) {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(15,23,42,0.6)' }]}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={32} color="#F97316" />
          </View>
          
          <Text style={[styles.title, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            Stay Connected!
          </Text>
          
          <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#475569' }]}>
            We would like to send notifications for:
          </Text>
          
          <View style={styles.list}>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.listText, { color: isDark ? '#CBD5E1' : '#334155' }]}>Connection Requests</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.listText, { color: isDark ? '#CBD5E1' : '#334155' }]}>Important Notices</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.listText, { color: isDark ? '#CBD5E1' : '#334155' }]}>Campus Updates</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.listText, { color: isDark ? '#CBD5E1' : '#334155' }]}>Post Interactions</Text>
            </View>
          </View>
          
          <View style={[styles.btnRow, { flexDirection: isNarrow ? 'column-reverse' : 'row' }]}>
            <TouchableOpacity 
              style={[styles.btn, styles.btnSecondary, { borderColor: isDark ? '#334155' : '#E2E8F0' }, isNarrow ? { width: '100%' } : { flex: 1 }]} 
              onPress={handleDeny}
            >
              <Text style={[styles.btnTextSecondary, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1} adjustsFontSizeToFit>
                Not Now
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.btn, styles.btnPrimary, isNarrow ? { width: '100%' } : { flex: 1 }]} 
              onPress={handleAllow}
            >
              <Text style={styles.btnTextPrimary} numberOfLines={1} adjustsFontSizeToFit>
                Allow Notifications
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  list: {
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  listText: {
    fontSize: 15,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  btnPrimary: {
    backgroundColor: '#F97316',
  },
  btnTextSecondary: {
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
