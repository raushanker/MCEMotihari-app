import React from 'react';
import { DepartmentsScreen } from '@/screens/DepartmentsScreen';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform, StatusBar } from 'react-native';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function DepartmentsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  return (
    <View style={{ flex: 1, paddingTop }}>
      <DepartmentsScreen
        onSelectDepartment={(id) => {
          router.push(`/department/${id}`);
        }}
        onOpenFacultyDirectory={() => {
          router.push('/faculty?from=departments');
        }}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
      />
    </View>
  );
}
