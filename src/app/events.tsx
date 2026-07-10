import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EventsModal } from '@/components/modals/EventsModal';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function EventsRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();
  return (
    <View style={{ flex: 1 }}>
      <EventsModal visible={true} onClose={() => handleBack(from as string)} isEmbedded={true} />
    </View>
  );
}
