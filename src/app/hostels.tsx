import React from 'react';
import { HostelsScreen } from '@/screens/HostelsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useExploreBack } from '@/hooks/useExploreBack';
import { useLocalSearchParams } from 'expo-router';

export default function HostelsRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const handleBack = useExploreBack();

  return (
    <View style={{ flex: 1, paddingTop }}>
      <HostelsScreen onBack={() => handleBack(from)} />
    </View>
  );
}
