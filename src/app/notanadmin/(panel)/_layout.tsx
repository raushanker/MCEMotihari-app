import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, ScrollView, Modal, Pressable, ActivityIndicator } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomDrawer, CustomDrawerRef } from '@/components/drawer/CustomDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');

export default function AdminPanelLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const appDrawerRef = React.useRef<CustomDrawerRef>(null);
  
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
      if (window.width > 768) {
        setIsMobileDrawerOpen(false);
      }
    });
    return () => subscription?.remove();
  }, []);

  const isDesktop = windowWidth > 768;

  // Security Check: Kick out non-admins immediately and enforce role permissions
  useEffect(() => {
    if (isLoading) return; // Wait for Firebase to finish loading user
    
    const checkAccess = async () => {
      if (!user) {
        setTimeout(() => router.replace('/login'), 0);
        return;
      }
      const adminUid = process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2';
      const isMaster = user.uid === adminUid || user.uid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2';
      
      let userRole = '';
      
      if (isMaster) {
        userRole = 'SUPER_ADMIN';
      } else if (user.adminRole) {
        userRole = user.adminRole;
      } else {
        setTimeout(() => router.replace('/'), 0);
        return;
      }

      // Role-Based Screen Access Verification
      const ROLE_PERMISSIONS: Record<string, string[]> = {
        SUPER_ADMIN: ['posts', 'reports', 'deletions', 'users', 'materials', 'admins', 'broadcast'],
        MODERATOR: ['posts', 'reports'],
        LIBRARY_ADMIN: ['materials'],
        NOTIFICATION_ADMIN: ['broadcast'],
      };

      // Determine what item key corresponds to the current pathname
      let itemKey = '';
      if (pathname === '/notanadmin/posts') itemKey = 'posts';
      else if (pathname === '/notanadmin/reports') itemKey = 'reports';
      else if (pathname === '/notanadmin/deletions') itemKey = 'deletions';
      else if (pathname === '/notanadmin/users') itemKey = 'users';
      else if (pathname === '/notanadmin/materials') itemKey = 'materials';
      else if (pathname === '/notanadmin/admins') itemKey = 'admins';
      else if (pathname === '/notanadmin/broadcast') itemKey = 'broadcast';

      if (itemKey) {
        const allowedItems = ROLE_PERMISSIONS[userRole] || [];
        if (!allowedItems.includes(itemKey)) {
          // If unauthorized, redirect to the dashboard
          setTimeout(() => router.replace('/notanadmin/dashboard'), 0);
        }
      }
    };
    checkAccess();
  }, [user, pathname, isLoading]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  // Double check user exists before rendering (useEffect will handle redirect)
  if (!user || (!user.adminRole && user.uid !== (process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2'))) {
    return null; // Prevent flashing content while redirect is processing
  }

  return (
    <CustomDrawer
      ref={appDrawerRef}
      user={user}
      onLoginPress={() => router.push('/login')}
      onProfilePress={() => router.push('/profile')}
      onLogoutPress={handleLogout}
      onNavigate={(screen) => {
        if (screen === 'Home Feed') router.replace('/');
        else if (screen === 'Sign In') router.push('/login');
        else if (screen === 'Profile tab') router.push('/profile');
        else if (screen === 'Syllabus') router.push('/syllabus');
        else if (screen === 'College Notices') router.push('/notice');
        else if (screen === 'Academic Departments') router.push('/departments');
        else if (screen === 'Faculty Directory') router.push('/faculty?from=admin');
        else if (screen === 'Hostels & Campus Living') router.push('/hostels');
        else if (screen === 'Contact Support') router.push('/support');
        else {
          // If modal requests are clicked in admin panel, just take them home
          router.replace('/');
        }
      }}
      activeScreen="Admin Panel"
    >
      <View style={styles.container}>
      <View style={[styles.mainArea, { backgroundColor: theme.background }]}>
        <View style={[styles.mobileHeader, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={() => appDrawerRef.current?.open()} style={styles.hamburgerBtn}>
            <Ionicons name="menu" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.mobileHeaderTitle, { color: theme.text }]}>Admin Console</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.contentWrapper}>
          <Slot />
        </View>
      </View>
    </View>
    </CustomDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Light gray background for contrast
  },
  desktopSidebar: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    elevation: 4,
    boxShadow: Platform.OS === 'web' ? '2px 0 8px rgba(0,0,0,0.05)' : undefined,
  },
  sidebarContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
  menuItemActive: {
    backgroundColor: '#FFF7ED', // Light orange tint
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 12,
  },
  menuTextActive: {
    color: '#F97316',
    fontWeight: '700',
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  adminRole: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  mainArea: {
    flex: 1,
    flexDirection: 'column',
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 2px 4px rgba(0,0,0,0.05)' : undefined,
  },
  hamburgerBtn: {
    padding: 4,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  contentWrapper: {
    flex: 1,
    overflow: 'hidden', // Contain scrolling within the slot screens
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  mobileDrawer: {
    width: 280,
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
  },
});
