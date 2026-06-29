import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { HumanitiesSyllabusScreen } from '@/screens/HumanitiesSyllabusScreen';
import { SyllabusScreen } from '@/screens/SyllabusScreen';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SyllabusRoute() {
  const router = useRouter();
  const inParams = useLocalSearchParams();
  const initialBranchId = typeof inParams.deptId === 'string' ? inParams.deptId : undefined;
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Platform.OS === 'android' ? (statusBarHeight || 24) : (insets.top || 44);

  const handleBack = () => {
    if (inParams.from === 'hub' && inParams.deptId) {
      router.replace(`/department/${encodeURIComponent(inParams.deptId as string)}?deptId=${encodeURIComponent(inParams.deptId as string)}`);
    } else if (inParams.from === 'departments') {
      router.replace('/departments');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (initialBranchId === 'humanities') {
    return (
      <View style={{ flex: 1, paddingTop }}>
        <HumanitiesSyllabusScreen onBack={handleBack} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop }}>
      <SyllabusScreen
        key={`syllabus-${initialBranchId || 'all'}`}
        initialBranchId={initialBranchId}
        onBack={handleBack}
      />
    </View>
  );
}
