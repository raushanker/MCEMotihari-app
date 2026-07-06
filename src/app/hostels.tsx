import React from 'react';
import { HostelsScreen } from '@/screens/HostelsScreen';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform, StatusBar } from 'react-native';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function HostelsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Math.max(insets.top, 16);

  return (
    <View style={{ flex: 1, paddingTop }}>
      <HostelsScreen
        onBack={() => {
          if (router.canGoBack()) {
            if (router.canGoBack()) { router.back(); } else { router.replace('/'); }
          } else {
            router.replace('/');
          }
        }}
      />
    </View>
  );
}
