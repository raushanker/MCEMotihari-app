import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StudyMaterialsModal } from '@/components/modals/StudyMaterialsModal';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function StudyMaterialsRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1 }}>
      <StudyMaterialsModal visible={true} onClose={() => handleBack(from as string)} isEmbedded={true} />
    </View>
  );
}
