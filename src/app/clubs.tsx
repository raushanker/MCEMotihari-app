import React from 'react';
import { ClubsScreen } from '@/screens/ClubsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform, StatusBar } from 'react-native';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function ClubsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  return (
    <View style={{ flex: 1, paddingTop }}>
      <ClubsScreen
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
        onSelectDepartment={(id) => {
          router.push(`/department/${id}/society?from=explore`);
        }}
      />
    </View>
  );
}
