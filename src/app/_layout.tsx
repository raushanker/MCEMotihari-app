import React, { useEffect } from 'react';
import { Tabs, SplashScreen, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View, Text, StyleSheet, Platform, Animated, TouchableOpacity, LogBox, StatusBar as RNStatusBar } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { ExploreMenuModal } from '@/components/modals/ExploreMenuModal';
import { NotificationPermissionModal } from '@/components/modals/NotificationPermissionModal';
import * as Notifications from 'expo-notifications';
import { registerAndSavePushToken } from '@/utils/notifications';
import { feedScrollY, clampedScrollY } from '@/utils/scrollState';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function ToastNotification() {
  const toast = useAppStore(state => state.toast);
  const hideToast = useAppStore(state => state.hideToast);
  const { isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (toast) {
      // Entry animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [toast]);

  if (!toast) return null;
  
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  
  // Premium curated Hinglish color palette mapping
  let bgColor, borderColor, textColor, statusColor, iconName: any, closeColor;
  
  if (isSuccess) {
    statusColor = '#22C55E';
    iconName = 'checkmark-circle';
    bgColor = isDark ? '#14532D' : '#F0FDF4';
    borderColor = isDark ? '#22C55E' : '#86EFAC';
    textColor = isDark ? '#DCFCE7' : '#166534';
    closeColor = isDark ? '#86EFAC' : '#15803D';
  } else if (isError) {
    statusColor = '#EF4444';
    iconName = 'alert-circle';
    bgColor = isDark ? '#7F1D1D' : '#FEF2F2';
    borderColor = isDark ? '#EF4444' : '#FCA5A5';
    textColor = isDark ? '#FEE2E2' : '#991B1B';
    closeColor = isDark ? '#FCA5A5' : '#B91C1C';
  } else {
    statusColor = '#3B82F6';
    iconName = 'information-circle';
    bgColor = isDark ? '#1E3A8A' : '#EFF6FF';
    borderColor = isDark ? '#3B82F6' : '#93C5FD';
    textColor = isDark ? '#DBEAFE' : '#1E40AF';
    closeColor = isDark ? '#93C5FD' : '#1D4ED8';
  }
  
  // Position toast beautifully above bottom navigation (tab bar height + margin + inset)
  const bottomPosition = insets.bottom + 140;

  return (
    <Animated.View style={[
      styles.toastWrapper,
      {
        backgroundColor: bgColor,
        borderColor: borderColor,
        bottom: bottomPosition,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }
    ]}>
      <Ionicons name={iconName} size={22} color={statusColor} style={styles.toastIcon} />
      <Text style={[styles.toastText, { color: textColor }]}>
        {isError && !toast.message.includes('⚠️') ? '⚠️ ' + toast.message : toast.message}
      </Text>
      <TouchableOpacity onPress={hideToast} style={styles.toastClose} activeOpacity={0.75}>
        <Ionicons name="close" size={18} color={closeColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RootLayout() {
  const { isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppStore(state => state.user);

  // Register push notifications when user is logged in
  useEffect(() => {
    if (user && user.uid && user.role !== 'Guest') {
      registerAndSavePushToken(user.uid);
    }
  }, [user]);

  // Listen for push notifications clicked in background/closed state
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Check if app was opened from a notification while killed
    const checkKilledStateNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response && response.notification.request.content.data) {
          const data = response.notification.request.content.data;
          if (data.url) {
            setTimeout(() => {
              router.push(data.url as any);
            }, 800);
          }
        }
      } catch (err) {
        console.warn('Error checking killed state notification:', err);
      }
    };
    
    checkKilledStateNotification();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.url) {
        setTimeout(() => {
          router.push(data.url as any);
        }, 800);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    useAppStore.getState().initStore().catch(err => {
      console.warn('Global store hydration failed:', err);
    });
  }, []);

  // Globally keep status bar perfectly synchronized with isDark theme changes!
  useEffect(() => {
    const barStyle = isDark ? 'light-content' : 'dark-content';
    RNStatusBar.setBarStyle(barStyle, true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('transparent');
      RNStatusBar.setTranslucent(true);
    }
  }, [isDark]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const tabBarDiffClamp = Animated.diffClamp(clampedScrollY, 0, 120);
  const tabBarTranslateY = tabBarDiffClamp.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 120],
    extrapolate: 'clamp',
  });

  const isSuspended = user?.status === 'suspended';
  const isBanned = user?.status === 'banned';

  if (user && (isSuspended || isBanned)) {
    return (
      <SafeAreaView style={[styles.suspendedContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]} edges={['top', 'bottom']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.suspendedCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
          <View style={[styles.suspendedIconBg, { backgroundColor: isSuspended ? '#FEF3C7' : '#FEE2E2' }]}>
            <Ionicons 
              name={isSuspended ? "warning-outline" : "ban-outline"} 
              size={44} 
              color={isSuspended ? "#D97706" : "#DC2626"} 
            />
          </View>
          <Text style={[styles.suspendedTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {isSuspended ? 'Account Suspended' : 'Account Banned'}
          </Text>
          <Text style={[styles.suspendedBody, { color: isDark ? '#94A3B8' : '#475569' }]}>
            {isSuspended 
              ? `Hello ${user.name},\n\nYour account has been temporarily suspended by the MCE Connect Moderation Team for violating our Community Guidelines and Terms of Service.\n\nIf you believe this is a mistake, please reach out to Support at mcemotihari.tech@gmail.com.`
              : `Hello ${user.name},\n\nYour account has been permanently banned from MCE Connect due to severe or repeated violations of our Community Guidelines and safety policies.\n\nAccess to all platform features has been revoked.`
            }
          </Text>
          <TouchableOpacity
            style={styles.suspendedLogoutBtn}
            onPress={async () => {
              const { signOut } = require('firebase/auth');
              const { auth } = require('@/config/firebase');
              try {
                await signOut(auth);
              } catch(e) {}
              useAppStore.getState().logout();
              router.replace('/login');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.suspendedLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor="transparent" translucent />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? Math.max(24, insets.bottom + 8) : Math.max(24, insets.bottom + 16),
            left: 16,
            right: 16,
            borderRadius: 36,
            borderTopWidth: 0,
            elevation: 15,
            boxShadow: Platform.OS === 'web' ? `${0}px ${8}px ${16}px #000` : undefined,

            height: 64,
            paddingBottom: 0,
            paddingTop: 0,
            transform: [{ translateY: Platform.OS === 'web' ? 0 : tabBarTranslateY }],
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarActiveTintColor: '#D95A1D', // Orange from the image
          tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            href: '/',
            tabBarLabel: () => {
              const isActive = pathname === '/';
              return <Text style={{ fontSize: 11, fontWeight: isActive ? 'bold' : '600', marginTop: 4, color: isActive ? '#D95A1D' : (isDark ? '#64748B' : '#94A3B8') }}>Home</Text>;
            },
            tabBarIcon: () => {
              const isActive = pathname === '/';
              return <Ionicons name="home" size={24} color={isActive ? '#D95A1D' : (isDark ? '#64748B' : '#94A3B8')} />;
            },
          }}
        />
        <Tabs.Screen
          name="network"
          options={{
            title: 'Network',
            href: '/network',
            tabBarLabel: () => {
              const isActive = pathname === '/network';
              return <Text style={{ fontSize: 11, fontWeight: isActive ? 'bold' : '600', marginTop: 4, color: isActive ? '#D95A1D' : (isDark ? '#64748B' : '#94A3B8') }}>Network</Text>;
            },
            tabBarIcon: () => {
              const isActive = pathname === '/network';
              return <Ionicons name="people" size={24} color={isActive ? '#D95A1D' : (isDark ? '#64748B' : '#94A3B8')} />;
            },
          }}
        />
        <Tabs.Screen
          name="explore"
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              useAppStore.getState().setExploreMenuVisible(true);
            },
          })}
          options={{
            title: 'Explore',
            tabBarLabel: () => null,
            tabBarIcon: ({ color, focused }) => (
              <View style={{
                top: -18,
                justifyContent: 'center',
                alignItems: 'center',
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                boxShadow: Platform.OS === 'web' ? `${0}px ${8}px ${12}px #D95A1D` : undefined,

                elevation: 12,
              }}>
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#D95A1D',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: isDark ? '#1E293B' : '#F3F4F6',
                }}>
                  <Ionicons name="compass-outline" size={30} color="#FFFFFF" />
                </View>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="notice"
          options={{
            title: 'Notice',
            href: '/notice',
            tabBarLabel: () => {
              const isActive = pathname === '/notice';
              return <Text style={{ fontSize: 11, fontWeight: isActive ? 'bold' : '600', marginTop: 4, color: isActive ? '#D95A1D' : (isDark ? '#64748B' : '#94A3B8') }}>Notice</Text>;
            },
            tabBarIcon: () => {
              const isActive = pathname === '/notice';
              return <Ionicons name="document-text" size={24} color={isActive ? '#D95A1D' : (isDark ? '#64748B' : '#94A3B8')} />;
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            href: '/profile',
            tabBarLabel: () => {
              const isActive = pathname === '/profile';
              return <Text style={{ fontSize: 11, fontWeight: isActive ? 'bold' : '600', marginTop: 4, color: isActive ? '#D95A1D' : (isDark ? '#64748B' : '#94A3B8') }}>Profile</Text>;
            },
            tabBarIcon: () => {
              const isActive = pathname === '/profile';
              return <Ionicons name="person" size={24} color={isActive ? '#D95A1D' : (isDark ? '#64748B' : '#94A3B8')} />;
            },
          }}
        />
        {/* Hide other screens from tabs */}
        <Tabs.Screen name="[username]" options={{ href: null }} />
        <Tabs.Screen name="public-posts/[username]" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null }} />
        <Tabs.Screen name="post/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="activity-feed" options={{ href: null }} />
        <Tabs.Screen name="event/[id]" options={{ href: null }} />
        <Tabs.Screen name="notice/[id]" options={{ href: null }} />
        <Tabs.Screen name="study/[id]" options={{ href: null }} />
        <Tabs.Screen name="departments" options={{ href: null }} />
        <Tabs.Screen name="department/[id]/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="department/[id]/laboratory" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="department/[id]/society" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="department/[id]/consultancy" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="department/[id]/testing-fabrication" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="faculty" options={{ href: null }} />
        <Tabs.Screen name="syllabus" options={{ href: null }} />
        <Tabs.Screen name="hostels" options={{ href: null }} />
        <Tabs.Screen name="clubs" options={{ href: null }} />
        <Tabs.Screen name="ecell" options={{ href: null }} />
        <Tabs.Screen name="privacy-policy" options={{ href: null }} />
        <Tabs.Screen name="terms" options={{ href: null }} />
        <Tabs.Screen name="delete-account" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="nss" options={{ href: null }} />
        <Tabs.Screen name="magazine" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="notanadmin/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="notanadmin/(panel)" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="search" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>
      <ToastNotification />
      <ExploreMenuModal />
      <NotificationPermissionModal />
    </>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    maxWidth: 440,
    alignSelf: 'center',
    width: '92%',
  },
  toastIcon: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  toastClose: {
    marginLeft: 10,
    padding: 4,
  },
  suspendedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  suspendedCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  suspendedIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  suspendedTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  suspendedBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  suspendedLogoutBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  suspendedLogoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
