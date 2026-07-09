import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useExploreBack } from '@/hooks/useExploreBack';
import { HumanitiesSyllabusScreen } from '@/screens/HumanitiesSyllabusScreen';
import { SyllabusScreen } from '@/screens/SyllabusScreen';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SyllabusRoute() {
  const router = useRouter();
  const inParams = useLocalSearchParams<{ deptId?: string; from?: string }>();
  const initialBranchId = inParams.deptId;
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const handleBack = useExploreBack();

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (inParams.from === 'hub' && inParams.deptId) {
      router.replace(`/department/${encodeURIComponent(inParams.deptId)}?deptId=${encodeURIComponent(inParams.deptId)}`);
    } else if (inParams.from === 'departments') {
      router.replace('/departments');
    } else {
      handleBack(inParams.from);
    }
  };

  if (initialBranchId === 'humanities') {
    return (
      <View style={{ flex: 1, paddingTop }}>
        <HumanitiesSyllabusScreen onBack={onBack} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop }}>
      <SyllabusScreen
        key={`syllabus-${initialBranchId || 'all'}`}
        initialBranchId={initialBranchId}
        onBack={onBack}
      />
    </View>
  );
}
