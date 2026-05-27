import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DrawerMenuSectionProps {
  heading: string;
  children: React.ReactNode;
}

export function DrawerMenuSection({ heading, children }: DrawerMenuSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{heading}</Text>
      <View style={styles.itemsContainer}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  heading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8', // Muted slate-400
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  itemsContainer: {
    width: '100%',
  },
});
