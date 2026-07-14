import React from 'react';
import {Platform, StyleSheet, View, Text, TouchableOpacity, Linking, Share} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Faculty } from '@/data/faculty';
import { DEPARTMENTS } from '@/data/departments';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FacultyCardProps {
  faculty: Faculty;
  onPressProfile: () => void;
}

// Generate harmonized color palette based on string initials for professional academic feel
const getAvatarColors = (name: string, isDark: boolean) => {
  const code = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
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
  return isDark ? darkPalettes[code % darkPalettes.length] : lightPalettes[code % lightPalettes.length];
};

export const FacultyCard: React.FC<FacultyCardProps> = React.memo(({ faculty, onPressProfile }) => {
  const isPrincipal = faculty.name.includes('Navneet Kumar');
  const initials = faculty.name
    .split(' ')
    .filter(n => !n.includes('.') && !n.includes('(') && !n.includes(')'))
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || faculty.name.substring(0, 2).toUpperCase();

  const theme = useThemeColors();
  const colors = getAvatarColors(faculty.name, theme.isDark);

  // Get department display name
  const departmentName = DEPARTMENTS.find(d => d.id === faculty.department)?.name || faculty.department;

  const handleCall = () => {
    Linking.openURL(`tel:${faculty.phone}`).catch(err => {
      console.warn('Failed to open dialer:', err);
    });
  };

  const handleEmail = () => {
    if (faculty.email) {
      Linking.openURL(`mailto:${faculty.email}`).catch(err => {
        console.warn('Failed to open mail client:', err);
      });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: faculty.name,
        message: `MCE Motihari Faculty Profile:\n\nName: ${faculty.name}\nDesignation: ${faculty.designation}\nDepartment: ${departmentName}\nPhone: ${faculty.phone}\n${faculty.email ? `Email: ${faculty.email}\n` : ''}Profile Link: ${faculty.profileUrl}\n\nShared from MCE Connect app.\nDownload here: https://play.google.com/store/apps/details?id=mcemotihari.app`,
      });
    } catch (error) {
      console.warn('Failed to share:', error);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, isPrincipal && [styles.principalCard, { backgroundColor: theme.isDark ? 'rgba(245,158,11,0.06)' : '#FFFDF6' }]]}>
      {isPrincipal && (
        <View style={styles.principalBanner}>
          <Ionicons name="ribbon-sharp" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.principalBannerText}>LEADERSHIP PORTRAIT</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.mainContainer}
        onPress={onPressProfile}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`View profile of ${faculty.name}`}
      >
        {/* Avatar Frame */}
        <View style={[styles.avatar, { backgroundColor: isPrincipal ? (theme.isDark ? 'rgba(217,119,6,0.2)' : '#FEF3C7') : colors.bg, borderColor: theme.cardBorder }]}>
          {faculty.imageUrl ? (
            <Image 
              source={{ uri: faculty.imageUrl }} 
              style={{ width: '100%', height: '100%', borderRadius: 28 }} 
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Text style={[styles.avatarText, { color: isPrincipal ? '#D97706' : colors.text }]}>
              {initials}
            </Text>
          )}
          {faculty.isHod && (
            <View style={[styles.hodSmallIndicator, { borderColor: theme.backgroundElement }]} />
          )}
        </View>

        {/* Content Column */}
        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, styles.clickableName, { color: theme.isDark ? '#F97316' : '#EA580C' }]} numberOfLines={1}>
              {faculty.name}
            </Text>
            {faculty.isHod && (
              <View style={[styles.hodBadge, { backgroundColor: theme.isDark ? 'rgba(234,88,12,0.1)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(234,88,12,0.2)' : '#FFD8A8' }]}>
                <Text style={styles.hodBadgeText}>HOD</Text>
              </View>
            )}
            {isPrincipal && (
              <View style={[styles.principalBadge, { backgroundColor: theme.isDark ? 'rgba(217,119,6,0.12)' : '#FEF3C7', borderColor: theme.isDark ? 'rgba(217,119,6,0.22)' : '#FDE68A' }]}>
                <Text style={styles.principalBadgeText}>PRINCIPAL</Text>
              </View>
            )}
          </View>

          <Text style={[styles.designation, { color: theme.text }]} numberOfLines={1}>
            {faculty.designation}
          </Text>
          <Text style={[styles.department, { color: theme.textSecondary }]} numberOfLines={1}>
            {departmentName}
          </Text>

          {/* Contact Details Removed as per user request to not show raw phone/email text */}
        </View>
      </TouchableOpacity>

      {/* Footer Action Buttons Section */}
      <View style={[styles.actionsBar, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : '#FAFBFD', borderTopColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryAction, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
          onPress={handleCall}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={15} color={theme.textSecondary} />
          <Text style={[styles.actionButtonText, { color: theme.text }]}>Call</Text>
        </TouchableOpacity>

        {/* Strict Empty Email Rule inside Footer Button */}
        {faculty.email ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryAction, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
            onPress={handleEmail}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={15} color={theme.textSecondary} />
            <Text style={[styles.actionButtonText, { color: theme.text }]}>Email</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryAction, isPrincipal && styles.principalPrimaryAction]} 
          onPress={onPressProfile}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={15} color="#FFFFFF" />
          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.shareAction, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social-outline" size={15} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0', // slate-200
    marginBottom: 12,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${12}px #0F172A` : undefined,

    elevation: 2,
    overflow: 'hidden',
  },
  principalCard: {
    borderColor: '#F59E0B', // Amber-500
    borderWidth: 1.5,
    backgroundColor: '#FFFDF6', // very soft warm yellow
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  principalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706', // amber-600
    paddingVertical: 4,
  },
  principalBannerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  mainContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  hodSmallIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EA580C', // HOD orange
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
    gap: 6,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  clickableName: {
    color: '#F97316', // orange accent link
    textDecorationLine: 'underline',
  },
  hodBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFD8A8',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  hodBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EA580C',
  },
  principalBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  principalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  designation: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569', // slate-600
    marginBottom: 2,
  },
  department: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B', // slate-500
    marginBottom: 8,
  },
  contactsContainer: {
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  actionsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9', // slate-100
    padding: 10,
    gap: 8,
    backgroundColor: '#FAFBFD',
  },
  actionButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  primaryAction: {
    backgroundColor: '#F97316', // Orange Accent
    flex: 1.6,
  },
  principalPrimaryAction: {
    backgroundColor: '#D97706', // amber-600
  },
  shareAction: {
    flex: 0.6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 0,
  },
  actionButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
  },
});
