import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CampusMapModal } from '@/components/modals/CampusMapModal';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function CampusMapRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1 }}>
      <CampusMapModal visible={true} onClose={() => handleBack(from as string)} isEmbedded={true} />
    </View>
  );
}
