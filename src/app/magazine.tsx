import React from 'react';
import { View, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagazineViewerScreen } from '@/screens/MagazineViewerScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

import { isInternalMagazineAccess, setInternalMagazineAccess } from '@/utils/navigationState';

const MAGAZINE_LINKS: Record<string, string> = {
  civil: 'https://drive.google.com/file/d/1WWKcbiZlIt_GzciDd85CDe_HdzcF1Jfn/view?usp=drive_link',
  mech_2024: 'https://drive.google.com/file/d/1TNuEziMbZU3adY6GWSISdTgOQNP4ziEd/view?usp=drive_link',
  mech_2026: 'https://drive.google.com/file/d/16Q4x_3snFq72PR26WePqt5YK9Kv3w69a/view?usp=drive_link',
  eee_vol1: 'https://drive.google.com/file/d/1nhsG-HwzXR6Rs2Tnm4VNqh6UNA2QkvLg/view?usp=drive_link',
  eee_vol2: 'https://drive.google.com/file/d/1Ur946hThBdclorVEPqrqOKMK0Qw--9Wm/view?usp=drive_link',
};

export default function MagazineRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title: string; driveUrl?: string; magId?: string; deptId?: string; from?: string }>();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  const finalDriveUrl = params.magId ? MAGAZINE_LINKS[params.magId] : params.driveUrl;

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      if (!isInternalMagazineAccess) {
        // Redirect to homepage if they tried to bypass and paste the URL directly
        router.replace('/');
      }
    }
    // Removed cleanup: JS memory inherently resets on fresh tab load, so cleanup here causes race conditions during rapid navigation
  }, [router]);

  if (Platform.OS === 'web' && !isInternalMagazineAccess) {
    return null; // Don't even attempt to render
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop }}>
      <MagazineViewerScreen 
        key={finalDriveUrl} // Forces a completely fresh mount so old PDFs don't flash
        title={params.title || 'Magazine'}
        driveUrl={finalDriveUrl || ''}
        onBack={() => {
          if (params.from === 'hub' && params.deptId) {
            router.replace(`/department/${params.deptId}`);
          } else if (params.from === 'nss') {
            router.replace('/nss');
          } else if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
      />
    </View>
  );
}
