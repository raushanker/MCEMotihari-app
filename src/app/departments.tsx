import { DepartmentsScreen } from '@/screens/DepartmentsScreen';
import React from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useLocalSearchParams } from 'expo-router';
import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DepartmentsRoute() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Math.max(insets.top, 16);

  const navigateToDepartment = (id: string) => {
    try {
      if (!id || typeof id !== 'string') {
        console.warn('[DepartmentsRoute] Invalid department id:', id);
        return;
      }
      // Pass deptId as BOTH path param AND explicit query param for reliability
      const separator = from === 'explore' ? '&' : '?';
      router.push(`/department/${encodeURIComponent(id)}?deptId=${encodeURIComponent(id)}${separator}from=${from || ''}`);
    } catch (error) {
      console.error('[DepartmentsRoute] Navigation failed:', error);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop }}>
      <ErrorBoundary>
        <DepartmentsScreen
          onSelectDepartment={navigateToDepartment}
          onOpenFacultyDirectory={() => {
            router.push('/faculty?from=departments');
          }}
          onBack={() => {
            if (from === 'explore') {
              try {
                const { useAppStore } = require('@/store/useAppStore');
                useAppStore.getState().setExploreActiveView('hub');
                useAppStore.getState().setExploreMenuVisible(true);
              } catch (e) {
                console.warn('Failed to reopen explore menu modal:', e);
              }
            }
            if (router.canGoBack()) {
              if (router.canGoBack()) { router.back(); } else { router.replace('/'); }
            } else {
              router.replace('/');
            }
          }}
        />
      </ErrorBoundary>
    </View>
  );
}
