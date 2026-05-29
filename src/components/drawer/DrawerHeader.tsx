import React from 'react';
import {Platform, StyleSheet, View, Text, TouchableOpacity, Image} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '@/hooks/useAuth';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DrawerHeaderProps {
  user: UserProfile | null;
  onLoginPress: () => void;
  onProfilePress?: () => void;
}

export function DrawerHeader({ user, onLoginPress, onProfilePress }: DrawerHeaderProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const getRoleColor = (role: string) => {
    if (role === 'Student') return '#A855F7';
    if (role === 'Alumni') return '#3B82F6';
    if (role === 'Faculty') return '#F97316';
    return '#6B7280';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, backgroundColor: theme.isDark ? '#0B0F19' : '#F8FAFC', borderBottomColor: theme.cardBorder }]}>
      {user ? (
        <TouchableOpacity 
          style={styles.profileContainer} 
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0F172A&color=fff&size=120` }}
              style={[styles.avatar, { borderColor: theme.backgroundElement }]}
            />
          </View>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{user.name}</Text>
          <View style={{ marginTop: 8, alignSelf: 'center' }}>
            <VerifiedBadge role={user.role} size="medium" />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.guestContainer}>
          <View style={[styles.guestAvatar, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.3)' : '#FED7AA' }]}>
            <Ionicons name="person-outline" size={32} color="#F97316" />
          </View>
          <Text style={[styles.guestTitle, { color: theme.text }]}>Guest User</Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>Explore & discover campus updates</Text>
          
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={onLoginPress}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC', // Slate-50 background for top section
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileContainer: {
    alignItems: 'center',
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #0F172A` : undefined,

  },
  badgeAbsolute: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1.5,
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${4}px #0F172A` : undefined,

    elevation: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  email: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
  },
  roleText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  guestContainer: {
    alignItems: 'center',
    width: '100%',
  },
  guestAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${6}px #F97316` : undefined,

  },
  guestTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  guestSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  loginButton: {
    backgroundColor: '#F97316', // Orange Accent
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20, // Pill shaped
    marginTop: 14,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #F97316` : undefined,

    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
