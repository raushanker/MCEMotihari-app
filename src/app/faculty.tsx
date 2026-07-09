import { Faculty, FACULTY_DATA } from '@/data/faculty';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { FacultyListScreen } from '@/screens/FacultyListScreen';
import { FacultyProfileScreen } from '@/screens/FacultyProfileScreen';
import { useLocalSearchParams, usePathname } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useThemeColors } from '@/hooks/useThemeColors';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { useExploreBack } from '@/hooks/useExploreBack';

export default function FacultyRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const handleBack = useExploreBack();


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
  const theme = useThemeColors();
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(() => {
    if (facultyId) {
      return FACULTY_DATA.find(f => f.id === facultyId) || null;
    }
    return null;
  });
  const paddingTop = Math.max(insets.top, 16);

  const handleBackNav = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (from === 'hub' && deptId) {
      router.replace(`/department/${encodeURIComponent(deptId)}?deptId=${encodeURIComponent(deptId)}`);
    } else {
      handleBack(from ?? undefined);
    }
  };

  if (selectedFaculty) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundElement, paddingTop }}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
        <FacultyProfileScreen
          faculty={selectedFaculty}
          onBack={() => {
            if (facultyId && selectedFaculty.id === facultyId) {
              handleBackNav();
            } else {
              setSelectedFaculty(null);
            }
          }}
        />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundElement, paddingTop }}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FacultyListScreen
        key={`faculty-${deptId || 'all'}`}
        initialDepartmentId={deptId || null}
        onBack={handleBackNav}
        onSelectFaculty={(faculty) => setSelectedFaculty(faculty)}
      />
      </View>
    </View>
  );
}
