import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalculatorScreen } from '@/screens/CalculatorScreen';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function CalculatorRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1 }}>
      <CalculatorScreen onBack={() => handleBack(from as string)} />
    </View>
  );
}
