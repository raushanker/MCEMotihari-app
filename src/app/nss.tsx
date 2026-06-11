import React, { useState } from 'react';
import { View, Platform, StatusBar } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NssScreen } from '@/screens/NssScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PdfViewerModal } from '@/components/modals/PdfViewerModal';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function NssRoute() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  const [isPdfVisible, setIsPdfVisible] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop }}>
      <NssScreen 
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
        onOpenMagazine={() => setIsPdfVisible(true)}
      />

      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url="https://drive.google.com/file/d/122-BPiVCHlUJKoJ2fqXnunZe1viCEvzj/view?usp=sharing"
          title="NSS Magazine"
        />
      )}
    </View>
  );
}
