import React from 'react';
import { View, Platform, StatusBar } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ECellScreen } from '@/screens/ECellScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function ECellRoute() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Platform.OS === 'android' ? (statusBarHeight || 24) : (insets.top || 44);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop }}>
      <ECellScreen 
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
      />
    </View>
  );
}
