import React, { useState } from 'react';
import { View, Platform, StatusBar as RNStatusBar, Alert, Modal, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { StudyMaterialsModal } from '@/components/modals/StudyMaterialsModal';
import { setInternalMagazineAccess } from '@/utils/navigationState';
import { DepartmentHubScreen } from '@/screens/DepartmentHubScreen';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function DepartmentHubRoute() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  const [isMaterialsVisible, setIsMaterialsVisible] = useState(false);
  const [magazineOptions, setMagazineOptions] = useState<{ title: string; options: { text: string; action: () => void }[] } | null>(null);

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

  const handleBack = () => {
    router.replace('/departments');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop }}>
      <DepartmentHubScreen
        departmentId={id as string}
        onBack={handleBack}
        onOpenFaculty={() => router.push(`/faculty?deptId=${id}&from=hub`)}
        onOpenSyllabus={() => router.push(`/syllabus?deptId=${id}&from=hub`)}
        onOpenMaterials={() => setIsMaterialsVisible(true)}
        onOpenSociety={() => router.push(`/department/${id}/society?from=hub`)}
        onOpenLaboratory={() => router.push(`/department/${id}/laboratory?from=hub`)}
        onOpenConsultancy={() => router.push(`/department/${id}/consultancy?from=hub`)}
        onOpenTestingFacilities={() => router.push(`/department/${id}/testing-fabrication?from=hub`)}
        onOpenMagazine={() => {
          if (id === 'civil' || id === 'civil_ca') {
            setInternalMagazineAccess(true);
            router.push(`/magazine?title=Civil%20Magazine&magId=civil&from=hub&deptId=${id}`);
          } else if (id === 'mechanical') {
            setMagazineOptions({
              title: 'Mechanical Magazine',
              options: [
                { text: 'ISSUE 2024', action: () => { setInternalMagazineAccess(true); router.push(`/magazine?title=Mechanical%20Magazine%202024&magId=mech_2024&from=hub&deptId=${id}`) } },
                { text: 'ISSUE 2026', action: () => { setInternalMagazineAccess(true); router.push(`/magazine?title=Mechanical%20Magazine%202026&magId=mech_2026&from=hub&deptId=${id}`) } }
              ]
            });
          } else if (id === 'eee') {
            setMagazineOptions({
              title: 'Electrical Magazine',
              options: [
                { text: 'Volume 1', action: () => { setInternalMagazineAccess(true); router.push(`/magazine?title=Electrical%20Magazine%20Vol%201&magId=eee_vol1&from=hub&deptId=${id}`) } },
                { text: 'Volume 2', action: () => { setInternalMagazineAccess(true); router.push(`/magazine?title=Electrical%20Magazine%20Vol%202&magId=eee_vol2&from=hub&deptId=${id}`) } }
              ]
            });
          } else {
            Alert.alert(
              "Not Available 🚫", 
              "We do not have any official magazine available for this department on the website yet."
            );
          }
        }}
      />
      {isMaterialsVisible && (
        <StudyMaterialsModal 
          visible={isMaterialsVisible} 
          onClose={() => setIsMaterialsVisible(false)} 
          initialFilterBranch={mapIdToFilterString(id as string)}
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
