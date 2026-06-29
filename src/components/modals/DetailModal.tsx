import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';

const { height } = Dimensions.get('window');

interface DetailModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  refreshControl?: any;
  disableScroll?: boolean;
  fullHeight?: boolean;
}

export function DetailModal({ visible, title, onClose, children, refreshControl, disableScroll, fullHeight }: DetailModalProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <View style={[
          styles.bottomSheet, 
          { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
          fullHeight ? { height: '100%', maxHeight: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 0 } : { maxHeight: height * 0.84 }
        ]}>
          {!fullHeight && <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />}
          <View style={[styles.sheetHeader, fullHeight && { paddingTop: Math.max(16, insets.top) }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.sheetClose, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          {disableScroll ? (
            <View style={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
              {children}
            </View>
          ) : (
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]}
              refreshControl={refreshControl}
            >
              {children}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sheetClose: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
export default DetailModal;
