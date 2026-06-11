import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { showAppError } from '@/utils/errors/errorManager';

interface FastLoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export function FastLoginModal({ 
  visible, 
  onClose, 
  onSuccess,
  title = "Login Required 🔒",
  subtitle = "Guests cannot access this secure area. Complete a quick Google Sign-In below to instantly unlock this feature and connect with the MCE community!"
}: FastLoginModalProps) {
  const theme = useThemeColors();
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleFastGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        showAppError('Google Sign-In Failed', 'Unable to complete fast login. Please try again.');
      }
    } catch (err) {
      showAppError('Google Sign-In Error', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <View style={[styles.bottomSheet, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, height: 260 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: theme.cardBorder }]}>
            <Text style={[styles.sheetTitle, { color: theme.text, fontSize: 16 }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20 }}>
              {subtitle}
            </Text>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderWidth: 1.2, 
                borderColor: '#CBD5E1', 
                height: 46, 
                borderRadius: 12,
                justifyContent: 'center', 
                alignItems: 'center', 
                flexDirection: 'row',
                width: '100%',
                boxShadow: Platform.OS === 'web' ? '0px 2px 4px #00000010' : undefined,
                elevation: 1,
              }}
              onPress={handleFastGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#000" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14 }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontWeight: '700',
  },
});
