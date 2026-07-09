import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CGPACalculatorScreen } from '@/screens/CGPACalculatorScreen';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function CGPACalculatorRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1, paddingTop }}>
      <CGPACalculatorScreen onBack={() => handleBack(from as string)} />
    </View>
  );
}
