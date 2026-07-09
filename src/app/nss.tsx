import React, { useState } from 'react';
import { View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NssScreen } from '@/screens/NssScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PdfViewerModal } from '@/components/modals/PdfViewerModal';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useExploreBack } from '@/hooks/useExploreBack';
import { useLocalSearchParams } from 'expo-router';


export default function NssRoute() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 16);
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleBack = useExploreBack();

  const [isPdfVisible, setIsPdfVisible] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop }}>
      <NssScreen 
        onBack={() => handleBack(from)}
        onOpenMagazine={() => setIsPdfVisible(true)}
        onOpenChatRoom={() => router.push('/community?room=humanities&from=/nss')}
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
