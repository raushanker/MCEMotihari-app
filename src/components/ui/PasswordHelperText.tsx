import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { PasswordValidationResult } from '@/utils/passwordValidator';
import { useThemeColors } from '@/hooks/useThemeColors';

interface PasswordHelperTextProps {
  password: string;
  result: PasswordValidationResult;
}

export function PasswordHelperText({ password, result }: PasswordHelperTextProps) {
  const theme = useThemeColors();
  const isTyping = password.length > 0;

  const renderCheckItem = (satisfied: boolean, label: string) => {
    let iconName: any = 'ellipse-outline';
    let iconColor = '#94A3B8';
    let textColor: string = theme.textSecondary;

    if (isTyping) {
      iconName = satisfied ? 'checkmark-circle' : 'close-circle';
      iconColor = satisfied ? '#22C55E' : '#EF4444';
      textColor = satisfied ? (theme.isDark ? '#4ADE80' : '#16A34A') : (theme.isDark ? '#F87171' : '#DC2626');
    }

    return (
      <View style={styles.itemRow}>
        <Ionicons name={iconName} size={13} color={iconColor} style={{ marginRight: 6, marginTop: 1.5 }} />
        <Text style={[styles.itemText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { borderColor: theme.cardBorder, backgroundColor: theme.isDark ? 'rgba(30,41,59,0.3)' : '#F8FAFC' }]}>
      <Text style={[styles.title, { color: theme.text }]}>Password Requirements:</Text>
      
      {renderCheckItem(result.hasMinLength, 'Minimum 6 characters')}
      {renderCheckItem(result.hasLetter, 'Contains letter')}
      {renderCheckItem(result.hasNumber, 'Contains number')}
      {renderCheckItem(result.hasSpecial, 'Contains special character (@ # ! $)')}
      {renderCheckItem(result.hasNoConsecutiveIdentical, 'No more than 2 repeated characters in sequence')}
      
      <Text style={[styles.example, { color: theme.textSecondary }]}>
        Example: <Text style={{ fontWeight: 'bold', color: '#F97316' }}>pass@324</Text>
      </Text>
      
      {isTyping && !result.isValid && result.errorMessage ? (
        <Text style={[styles.errorText, { color: theme.isDark ? '#F87171' : '#DC2626' }]}>⚠️ {result.errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  title: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemText: {
    fontSize: 10.5,
    fontWeight: '600',
    lineHeight: 15,
  },
  example: {
    fontSize: 10.5,
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 6,
  },
});
