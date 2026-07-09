import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ECellScreen } from '@/screens/ECellScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useExploreBack } from '@/hooks/useExploreBack';
import { useLocalSearchParams } from 'expo-router';

export default function ECellRoute() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop }}>
      <ECellScreen
        onBack={() => handleBack(from)}
        onNavigateAway={() => handleBack(from)}
        onOpenNoticeBoard={() => router.push('/dept-room?deptId=ecell')}
      />
    </View>
  );
}
