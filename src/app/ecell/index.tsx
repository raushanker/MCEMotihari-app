import React from 'react';
import { View, Platform, StatusBar } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ECellScreen } from '@/screens/ECellScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useAppStore } from '@/store/useAppStore';

export default function ECellRoute() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Math.max(insets.top, 16);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop }}>
      <ECellScreen 
        onBack={() => {
          router.replace('/');
          setTimeout(() => {
            useAppStore.getState().setExploreActiveView('hub');
            useAppStore.getState().setExploreMenuVisible(true, true);
          }, 50);
        }}
      />
    </View>
  );
}
