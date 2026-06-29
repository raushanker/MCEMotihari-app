import { Faculty, FACULTY_DATA } from '@/data/faculty';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { FacultyListScreen } from '@/screens/FacultyListScreen';
import { FacultyProfileScreen } from '@/screens/FacultyProfileScreen';
import { useLocalSearchParams, usePathname } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FacultyRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const pathname = usePathname();

  // Extract faculty params from multiple sources (reliable on Android APK)
  const { facultyId, deptId, from } = useMemo(() => {
    let fid: string | null = null;
    let did: string | null = null;
    let frm: string | null = null;

    try {
      // Source 1: useLocalSearchParams
      if (params && typeof params === 'object') {
        const rawFid = params.facultyId;
        if (rawFid !== null && rawFid !== undefined) {
          const id = Array.isArray(rawFid) ? rawFid[0] : rawFid;
          if (id && typeof id === 'string' && id.trim().length > 0) fid = id.trim();
        }
        const rawDid = params.deptId;
        if (rawDid !== null && rawDid !== undefined) {
          const id = Array.isArray(rawDid) ? rawDid[0] : rawDid;
          if (id && typeof id === 'string' && id.trim().length > 0) did = id.trim();
        }
        const rawFrom = params.from;
        if (rawFrom !== null && rawFrom !== undefined) {
          const f = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;
          if (f && typeof f === 'string' && f.trim().length > 0) frm = f.trim();
        }
      }

      // Source 2: Extract from pathname as fallback
      if (!fid && pathname) {
        const match = pathname.match(/\/faculty\?.*facultyId=([^&]+)/);
        if (match && match[1]) fid = decodeURIComponent(match[1]);
      }
    } catch (e) {
      console.error('[FacultyRoute] Failed to extract params:', e);
    }

    return { facultyId: fid, deptId: did, from: frm };
  }, [params, pathname]);
  const insets = useSafeAreaInsets();
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(() => {
    if (facultyId) {
      return FACULTY_DATA.find(f => f.id === facultyId) || null;
    }
    return null;
  });
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Platform.OS === 'android' ? (statusBarHeight || 24) : (insets.top || 44);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (from === 'departments') {
      router.replace('/departments');
    } else if (from === 'feed') {
      router.replace('/');
    } else if (from === 'ecell') {
      router.replace('/ecell');
    } else if (from === 'admin') {
      router.replace('/notanadmin');
    } else if (from === 'hub' && deptId) {
      router.replace(`/department/${encodeURIComponent(deptId)}?deptId=${encodeURIComponent(deptId)}`);
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
            if (facultyId && selectedFaculty.id === facultyId) {
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
        key={`faculty-${deptId || 'all'}`}
        initialDepartmentId={deptId || null}
        onBack={handleBack}
        onSelectFaculty={(faculty) => setSelectedFaculty(faculty)}
      />
    </View>
  );
}
