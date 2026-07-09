import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StudyMaterialsModal } from '@/components/modals/StudyMaterialsModal';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DepartmentHubScreen } from '@/screens/DepartmentHubScreen';
import { useLocalSearchParams, usePathname } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Platform, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';

function safeNavigate(router: ReturnType<typeof useRouter>, path: string) {
  try {
    if (!path || typeof path !== 'string') return;
    router.push(path as any);
  } catch (error) {
    console.error('[DepartmentHubRoute] Navigation failed:', path, error);
  }
}

export default function DepartmentHubRoute() {
  const params = useLocalSearchParams<{ id?: string, deptId?: string, from?: string }>();
  const pathname = usePathname();

  // Extract department ID from multiple fallback sources (Android APK may not populate useLocalSearchParams correctly)
  const departmentId = useMemo<string | null>(() => {
    try {
      // Source 1: Dynamic route param [id]
      if (params && typeof params === 'object') {
        const raw = params.id;
        if (raw !== null && raw !== undefined) {
          const id = Array.isArray(raw) ? raw[0] : raw;
          if (id && typeof id === 'string' && id.trim().length > 0) return id.trim();
        }
      }

      // Source 2: Explicit query param deptId
      if (params && typeof params === 'object') {
        const rawDeptId = params.deptId;
        if (rawDeptId !== null && rawDeptId !== undefined) {
          const deptId = Array.isArray(rawDeptId) ? rawDeptId[0] : rawDeptId;
          if (deptId && typeof deptId === 'string' && deptId.trim().length > 0) return deptId.trim();
        }
      }

      // Source 3: Extract from pathname (e.g., /department/cse -> cse)
      if (pathname && typeof pathname === 'string') {
        const match = pathname.match(/\/department\/([^/?]+)/);
        if (match && match[1]) {
          const decodedId = decodeURIComponent(match[1]);
          if (decodedId.trim().length > 0) return decodedId.trim();
        }
      }

      return null;
    } catch (error) {
      console.error('[DepartmentHubRoute] Failed to extract params:', error);
      return null;
    }
  }, [params, pathname]);
  const router = useRouter();
  const theme = useThemeColors();

  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Math.max(insets.top, 16);

  const [isMaterialsVisible, setIsMaterialsVisible] = useState(false);
  const [magazineOptions, setMagazineOptions] = useState<{ title: string; options: { text: string; action: () => void }[] } | null>(null);
  
  

  // Guard: if no valid department ID, show error fallback immediately
  if (!departmentId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, paddingTop, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 12 }}>Department Not Found</Text>
        <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
          Unable to load department information. The link may be invalid.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={() => safeNavigate(router, '/departments')}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Back to Departments</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mapIdToFilterString = (deptId: string) => {
    switch (deptId) {
      case 'cse': return 'CSE';
      case 'cse_ai': return 'CSE (AI)';
      case 'civil': return 'Civil';
      case 'civil_ca': return 'Civil (CA)';
      case 'eee': return 'EEE';
      case 'mechanical': return 'Mechanical';
      default: return 'All';
    }
  };

  // Map department id → community chat room id
  const getDeptRoomId = (deptId: string): string | null => {
    switch (deptId) {
      case 'cse':
      case 'cse_ai':   return 'cse_ai';
      case 'civil':
      case 'civil_ca': return 'civil_ca';
      case 'eee':      return 'ee';
      case 'mechanical': return 'mech';
      default:         return null;
    }
  };

  const handleOpenChatRoom = () => {
    safeNavigate(router, `/dept-room?deptId=${departmentId}&from=hub`);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleOpenMagazine = () => {
    const id = departmentId;
    if (id === 'civil' || id === 'civil_ca') {
      
      safeNavigate(router, `/magazine?title=Civil%20Magazine&magId=civil&from=hub&deptId=${id}`);
    } else if (id === 'mechanical') {
      setMagazineOptions({
        title: 'Mechanical Magazine',
        options: [
          { text: 'ISSUE 2024', action: () => { safeNavigate(router, `/magazine?title=Mechanical%20Magazine%202024&magId=mech_2024&from=hub&deptId=${id}`) } },
          { text: 'ISSUE 2026', action: () => { safeNavigate(router, `/magazine?title=Mechanical%20Magazine%202026&magId=mech_2026&from=hub&deptId=${id}`) } }
        ]
      });
    } else if (id === 'eee') {
      setMagazineOptions({
        title: 'Electrical Magazine',
        options: [
          { text: 'Volume 1', action: () => { safeNavigate(router, `/magazine?title=Electrical%20Magazine%20Vol%201&magId=eee_vol1&from=hub&deptId=${id}`) } },
          { text: 'Volume 2', action: () => { safeNavigate(router, `/magazine?title=Electrical%20Magazine%20Vol%202&magId=eee_vol2&from=hub&deptId=${id}`) } },
          { text: 'Volume 3', action: () => { safeNavigate(router, `/magazine?title=Electrical%20Magazine%20Vol%203&magId=eee_vol3&from=hub&deptId=${id}`) } }
        ]
      });
    } else {
      Alert.alert(
        "Not Available 🚫", 
        "We do not have any official magazine available for this department on the website yet."
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop }}>
      <ErrorBoundary>
        <DepartmentHubScreen
          departmentId={departmentId}
          onBack={handleBack}
          onOpenFaculty={() => safeNavigate(router, `/faculty?deptId=${departmentId}&from=hub`)}
          onOpenSyllabus={() => safeNavigate(router, `/syllabus?deptId=${departmentId}&from=hub`)}
          onOpenMaterials={() => setIsMaterialsVisible(true)}
          onOpenSociety={() => safeNavigate(router, `/department/${departmentId}/society?from=hub&deptId=${departmentId}`)}
          onOpenLaboratory={() => safeNavigate(router, `/department/${departmentId}/laboratory?from=hub&deptId=${departmentId}`)}
          onOpenConsultancy={() => safeNavigate(router, `/department/${departmentId}/consultancy?from=hub&deptId=${departmentId}`)}
          onOpenTestingFacilities={() => safeNavigate(router, `/department/${departmentId}/testing-fabrication?from=hub&deptId=${departmentId}`)}
          onOpenMagazine={handleOpenMagazine}
          onOpenChatRoom={departmentId !== 'humanities' ? handleOpenChatRoom : undefined}
        />
      </ErrorBoundary>
      {isMaterialsVisible && (
        <StudyMaterialsModal 
          visible={isMaterialsVisible} 
          onClose={() => setIsMaterialsVisible(false)} 
          initialFilterBranch={mapIdToFilterString(departmentId)}
        />
      )}

      {magazineOptions && (
        <Modal transparent animationType="fade" visible={!!magazineOptions} onRequestClose={() => setMagazineOptions(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 320, backgroundColor: theme.backgroundElement, borderRadius: 16, padding: 24, elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 20, textAlign: 'center' }}>
                {magazineOptions.title}
              </Text>
              
              {magazineOptions.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={{ backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 10, marginBottom: 12, alignItems: 'center' }}
                  onPress={() => {
                    setMagazineOptions(null);
                    opt.action();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>{opt.text}</Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4, borderRadius: 10, backgroundColor: theme.isDark ? '#334155' : '#F1F5F9' }}
                onPress={() => setMagazineOptions(null)}
                activeOpacity={0.8}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
