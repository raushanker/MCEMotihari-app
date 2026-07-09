import { DepartmentsScreen } from '@/screens/DepartmentsScreen';
import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useExploreBack } from '@/hooks/useExploreBack';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DepartmentsRoute() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const handleBack = useExploreBack();

  const navigateToDepartment = (id: string) => {
    try {
      if (!id || typeof id !== 'string') return;
      router.push(`/department/${encodeURIComponent(id)}?deptId=${encodeURIComponent(id)}&from=${from || ''}`);
    } catch (error) {
      console.error('[DepartmentsRoute] Navigation failed:', error);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop }}>
      <ErrorBoundary>
        <DepartmentsScreen
          onSelectDepartment={navigateToDepartment}
          onOpenFacultyDirectory={() => {
            router.push(`/faculty?from=${from || ''}`);
          }}
          onBack={() => handleBack(from as string)}
        />
      </ErrorBoundary>
    </View>
  );
}
