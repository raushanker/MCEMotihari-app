import React from 'react';
import { ClubsScreen } from '@/screens/ClubsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useExploreBack } from '@/hooks/useExploreBack';
import { useLocalSearchParams } from 'expo-router';

export default function ClubsRoute() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const handleBack = useExploreBack();

  return (
    <View style={{ flex: 1, paddingTop }}>
      <ClubsScreen
        onBack={() => handleBack(from)}
        onSelectDepartment={(id) => {
          router.push(`/department/${id}/society?from=${from || ''}`);
        }}
      />
    </View>
  );
}
