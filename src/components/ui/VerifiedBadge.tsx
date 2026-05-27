import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '@/constants/theme';

interface VerifiedBadgeProps {
  role: 'Student' | 'Alumni' | 'Guest' | 'Faculty' | 'Other';
  size?: 'small' | 'medium' | 'mini';
}

export function VerifiedBadge({ role, size = 'small' }: VerifiedBadgeProps) {
  if (role === 'Guest') return null;

  const isStudent = role === 'Student';
  const isFaculty = role === 'Faculty';
  const isStaff = role === 'Other';
  
  let badgeColor = '#3B82F6'; // Default Alumni
  let badgeLabel = 'Alumni 🎓';
  
  if (isStudent) {
    badgeColor = '#A855F7';
    badgeLabel = 'Student';
  } else if (isFaculty) {
    badgeColor = '#F97316';
    badgeLabel = 'Faculty 🎖️';
  } else if (isStaff) {
    badgeColor = '#10B981';
    badgeLabel = 'Other';
  }

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          borderColor: badgeColor,
          backgroundColor: isStudent 
            ? 'rgba(168, 85, 247, 0.1)' 
            : isFaculty 
            ? 'rgba(249, 115, 22, 0.1)' 
            : isStaff
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(59, 130, 246, 0.1)',
        },
        size === 'medium' && styles.mediumContainer,
        size === 'mini' && styles.miniContainer,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: badgeColor },
          size === 'medium' && styles.mediumDot,
          size === 'mini' && styles.miniDot,
        ]}
      />
      <Text
        style={[
          styles.badgeText,
          { color: badgeColor },
          size === 'medium' && styles.mediumText,
          size === 'mini' && styles.miniText,
        ]}
      >
        {badgeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    boxShadow: `${0}px ${1}px ${1}px #000`,

    elevation: 1,
  },
  mediumContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  miniContainer: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 0.8,
    shadowOpacity: 0,
    elevation: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  mediumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  mediumText: {
    fontSize: 12,
  },
  miniText: {
    fontSize: 8.5,
    fontWeight: '600',
  },
});
export default VerifiedBadge;
