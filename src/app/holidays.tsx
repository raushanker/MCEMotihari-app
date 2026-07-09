import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HolidaysModal } from '@/components/modals/HolidaysModal';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function HolidaysRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1, paddingTop }}>
      <HolidaysModal visible={true} onClose={() => handleBack(from as string)} isEmbedded={true} />
    </View>
  );
}
