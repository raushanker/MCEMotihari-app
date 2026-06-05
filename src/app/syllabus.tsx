import React from 'react';
import { SyllabusScreen } from '@/screens/SyllabusScreen';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform, StatusBar } from 'react-native';

export default function SyllabusRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  return (
    <View style={{ flex: 1, paddingTop }}>
      <SyllabusScreen
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
