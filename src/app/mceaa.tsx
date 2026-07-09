import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MCEAAScreen } from '@/screens/MCEAAScreen';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function MCEAARoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1, paddingTop }}>
      <MCEAAScreen onBack={() => handleBack(from as string)} />
    </View>
  );
}
