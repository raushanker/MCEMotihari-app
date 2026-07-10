import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { HolidaysModal } from '@/components/modals/HolidaysModal';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function HolidaysRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1 }}>
      <HolidaysModal visible={true} onClose={() => handleBack(from as string)} isEmbedded={true} />
    </View>
  );
}
