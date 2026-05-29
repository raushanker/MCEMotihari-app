import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export function DrawerFooter() {
  const theme = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? '#0B0F19' : '#FFFFFF', borderTopColor: 'transparent' }]}>
      <Text style={[styles.since, { color: theme.isDark ? '#55657A' : '#94A3B8', opacity: 0.8 }]}>Estd 1980</Text>
      <Text style={[styles.title, { color: theme.textSecondary, opacity: 0.6 }]}>Motihari College of Engineering</Text>
      <Text style={[styles.subtitle, { color: theme.isDark ? '#475569' : '#94A3B8', opacity: 0.7 }]}>BEU Affiliated • AICTE Approved</Text>
      <Text style={[styles.copyright, { color: theme.isDark ? '#334155' : '#CBD5E1', opacity: 0.8 }]}>© 2026 mcemotihar.ac.in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 36, // Generous bottom padding to push up footer elements safely above system nav buttons
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  since: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 9,
    marginTop: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

