import React, { useEffect } from 'react';
import { Tabs, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View, Text, StyleSheet, Platform, Animated, TouchableOpacity, LogBox } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

// Suppress upstream third-party dependency warnings that are safe to ignore on Web
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
]);
import { ExploreMenuModal } from '@/components/modals/ExploreMenuModal';

function ToastNotification() {
  const toast = useAppStore(state => state.toast);
  const hideToast = useAppStore(state => state.hideToast);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  if (!toast) return null;
  
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  
  const statusColor = isSuccess ? '#22C55E' : isError ? '#EF4444' : '#3B82F6';
  const iconName = isSuccess ? 'checkmark-circle' : isError ? 'alert-circle' : 'information-circle';
  
  return (
    <View style={[
      styles.toastWrapper,
      {
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        borderColor: statusColor,
      }
    ]}>
      <Ionicons name={iconName} size={24} color={statusColor} style={styles.toastIcon} />
      <Text style={[styles.toastText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
        {toast.message}
      </Text>
      <TouchableOpacity onPress={hideToast} style={styles.toastClose}>
        <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 24 : 16,
            left: 16,
            right: 16,
            borderRadius: 36,
            borderTopWidth: 0,
            elevation: 15,
            boxShadow: `${0}px ${8}px ${16}px #000`,

            height: 64,
            paddingBottom: 0,
            paddingTop: 0,
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
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="network"
          options={{
            title: 'Network',
            tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
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
                boxShadow: `${0}px ${8}px ${12}px #D95A1D`,

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
            tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          }}
        />
        {/* Hide other screens from tabs */}
        <Tabs.Screen name="[username]" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null }} />
        <Tabs.Screen name="post/[id]" options={{ href: null }} />
        <Tabs.Screen name="departments" options={{ href: null }} />
        <Tabs.Screen name="faculty" options={{ href: null }} />
        <Tabs.Screen name="syllabus" options={{ href: null }} />
        <Tabs.Screen name="hostels" options={{ href: null }} />
      </Tabs>
      <ToastNotification />
      <ExploreMenuModal />
    </>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
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
});
