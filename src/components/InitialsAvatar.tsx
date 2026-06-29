import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface InitialsAvatarProps {
  name: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

// Generate harmonized color palette based on name characters for a modern professional look
const getAvatarColors = (name: string, isDark: boolean) => {
  const cleanName = name || 'Anonymous';
  let charSum = 0;
  for (let i = 0; i < cleanName.length; i++) {
    charSum += cleanName.charCodeAt(i);
  }
  
  const lightPalettes = [
    { bg: '#EEF2FF', text: '#4F46E5' }, // Indigo
    { bg: '#ECFDF5', text: '#059669' }, // Emerald
    { bg: '#EFF6FF', text: '#2563EB' }, // Blue
    { bg: '#FDF2F8', text: '#DB2777' }, // Pink
    { bg: '#FFF7ED', text: '#EA580C' }, // Orange
    { bg: '#FAF5FF', text: '#7C3AED' }, // Purple
  ];
  
  const darkPalettes = [
    { bg: 'rgba(79, 70, 229, 0.18)', text: '#818CF8' }, // Indigo
    { bg: 'rgba(5, 150, 105, 0.18)', text: '#34D399' }, // Emerald
    { bg: 'rgba(37, 99, 235, 0.18)', text: '#60A5FA' }, // Blue
    { bg: 'rgba(219, 39, 119, 0.18)', text: '#F472B6' }, // Pink
    { bg: 'rgba(234, 88, 12, 0.18)', text: '#FB923C' }, // Orange
    { bg: 'rgba(124, 58, 237, 0.18)', text: '#A78BFA' }, // Purple
  ];
  
  const palettes = isDark ? darkPalettes : lightPalettes;
  return palettes[charSum % palettes.length];
};

export const InitialsAvatar: React.FC<InitialsAvatarProps> = ({
  name,
  size = 40,
  style,
  textStyle,
}) => {
  const theme = useThemeColors();
  const colors = getAvatarColors(name, theme.isDark);

  const initials = (name || '')
    .split(' ')
    .filter(n => n && !n.includes('.') && !n.includes('(') && !n.includes(')'))
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || (name || 'A').substring(0, 2).toUpperCase();

  const fontSize = size * 0.4;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bg,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize,
            color: colors.text,
            lineHeight: size,
          },
          textStyle,
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
