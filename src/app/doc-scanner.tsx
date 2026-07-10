import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DocScannerScreen } from '@/screens/DocScannerScreen';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function DocScannerRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1 }}>
      <DocScannerScreen onBack={() => handleBack(from as string)} />
    </View>
  );
}
