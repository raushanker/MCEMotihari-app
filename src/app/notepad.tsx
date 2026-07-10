import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { NotepadModal } from '@/components/modals/NotepadModal';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function NotepadRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1 }}>
      <NotepadModal visible={true} onClose={() => handleBack(from as string)} isEmbedded={true} />
    </View>
  );
}
