import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';

interface DrawerMenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  isActive?: boolean;
}

export function DrawerMenuItem({ icon, label, onPress, color, isActive = false }: DrawerMenuItemProps) {
  const theme = useThemeColors();
  
  const inactiveColor = color || (theme.isDark ? '#94A3B8' : '#475569');
  const activeBgColor = theme.isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
  const activeTextColor = '#F97316';
  
  const currentBg = isActive ? activeBgColor : 'transparent';
  const currentTextColor = isActive ? activeTextColor : inactiveColor;
  const chevronColor = isActive ? activeTextColor : (theme.isDark ? '#475569' : '#CBD5E1');

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: currentBg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <Feather 
          name={icon} 
          size={20} 
          color={currentTextColor} 
          style={styles.icon} 
        />
        <Text style={[
          styles.label, 
          { color: currentTextColor },
          isActive && styles.activeLabel
        ]}>
          {label}
        </Text>
      </View>
      <Feather 
        name="chevron-right" 
        size={16} 
        color={chevronColor} 
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  activeContainer: {
    backgroundColor: '#FFF7ED', // Soft light orange active background
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 16,
    width: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  activeLabel: {
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 8,
  },
});
