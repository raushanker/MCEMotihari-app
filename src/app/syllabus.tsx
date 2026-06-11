import React from 'react';
import { SyllabusScreen } from '@/screens/SyllabusScreen';
import { HumanitiesSyllabusScreen } from '@/screens/HumanitiesSyllabusScreen';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform, StatusBar } from 'react-native';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function SyllabusRoute() {
  const router = useRouter();
  const inParams = useLocalSearchParams();
  const initialBranchId = typeof inParams.deptId === 'string' ? inParams.deptId : undefined;
  
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  const handleBack = () => {
    if (inParams.from === 'hub' && inParams.deptId) {
      router.replace(`/department/${inParams.deptId}`);
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
