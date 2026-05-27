import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export function DrawerFooter() {
  const theme = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? '#0B0F19' : '#FFFFFF', borderTopColor: 'transparent' }]}>
      <Text style={[styles.title, { color: theme.textSecondary, opacity: 0.6 }]}>Motihari College of Engineering</Text>
      <Text style={[styles.subtitle, { color: theme.isDark ? '#475569' : '#94A3B8', opacity: 0.7 }]}>BEU Affiliated • AICTE Approved</Text>
      <Text style={[styles.since, { color: theme.isDark ? '#475569' : '#94A3B8', opacity: 0.7 }]}>Since- 1980</Text>
      <Text style={[styles.copyright, { color: theme.isDark ? '#334155' : '#CBD5E1', opacity: 0.8 }]}>© 2026 mcemotihar.ac.in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  since: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  copyright: {
    fontSize: 9,
    marginTop: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
