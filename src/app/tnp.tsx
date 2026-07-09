import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TnPScreen } from '@/screens/TnPScreen';
import { FACULTY_DATA } from '@/data/faculty';
import { useExploreBack } from '@/hooks/useExploreBack';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function TnPRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const handleBack = useExploreBack();
  const router = useRouter();
  return (
    <View style={{ flex: 1, paddingTop }}>
      <TnPScreen
        onBack={() => handleBack(from as string)}
        onNavigateNoc={() => router.push(('/tnp-noc?from=' + (from || '')) as any)}
        onNavigateFacultyProfile={(facultyId) => {
          router.push((`/faculty-profile?id=${facultyId}&from=${from || ''}`) as any);
        }}
        onNavigateSupport={() => router.push('/support')}
        onOpenNoticeBoard={() => router.push('/dept-room?deptId=tnp' as any)}
      />
    </View>
  );
}
