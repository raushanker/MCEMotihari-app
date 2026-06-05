import React, { useState } from 'react';
import { FacultyListScreen } from '@/screens/FacultyListScreen';
import { FacultyProfileScreen } from '@/screens/FacultyProfileScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Faculty } from '@/data/faculty';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform, StatusBar } from 'react-native';

export default function FacultyRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deptId?: string }>();
  const insets = useSafeAreaInsets();
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  if (selectedFaculty) {
    return (
      <View style={{ flex: 1, paddingTop }}>
        <FacultyProfileScreen
          faculty={selectedFaculty}
          onBack={() => setSelectedFaculty(null)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop }}>
      <FacultyListScreen
        initialDepartmentId={params.deptId || null}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/departments');
          }
        }}
        onSelectFaculty={(faculty) => setSelectedFaculty(faculty)}
      />
    </View>
  );
}
