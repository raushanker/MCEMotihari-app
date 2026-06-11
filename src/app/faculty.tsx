import React, { useState } from 'react';
import { FacultyListScreen } from '@/screens/FacultyListScreen';
import { FacultyProfileScreen } from '@/screens/FacultyProfileScreen';
import { useLocalSearchParams } from 'expo-router';
import { Faculty, FACULTY_DATA } from '@/data/faculty';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform, StatusBar } from 'react-native';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function FacultyRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deptId?: string; from?: string; facultyId?: string }>();
  const insets = useSafeAreaInsets();
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(() => {
    if (params.facultyId) {
      return FACULTY_DATA.find(f => f.id === params.facultyId) || null;
    }
    return null;
  });
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  const handleBack = () => {
    if (params.from === 'departments') {
      router.replace('/departments');
    } else if (params.from === 'feed') {
      router.replace('/');
    } else if (params.from === 'ecell') {
      router.replace('/ecell');
    } else if (params.from === 'admin') {
      router.replace('/notanadmin');
    } else if (params.from === 'hub' && params.deptId) {
      router.replace(`/department/${params.deptId}`);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/departments');
    }
  };

  if (selectedFaculty) {
    return (
      <View style={{ flex: 1, paddingTop }}>
        <FacultyProfileScreen
          faculty={selectedFaculty}
          onBack={() => {
            if (params.facultyId && selectedFaculty.id === params.facultyId) {
              handleBack();
            } else {
              setSelectedFaculty(null);
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop }}>
      <FacultyListScreen
        key={`faculty-${params.deptId || 'all'}`}
        initialDepartmentId={params.deptId || null}
        onBack={handleBack}
        onSelectFaculty={(faculty) => setSelectedFaculty(faculty)}
      />
    </View>
  );
}
