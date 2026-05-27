import React from 'react';
import { DepartmentsScreen } from '@/screens/DepartmentsScreen';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function DepartmentsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <DepartmentsScreen
        onSelectDepartment={(id) => {
          router.push(`/faculty?deptId=${id}`);
        }}
        onOpenFacultyDirectory={() => {
          router.push('/faculty');
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
