import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function PostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useThemeColors();

  useEffect(() => {
    if (id) {
      // Redirect to the home feed and open the comments sheet for this post
      router.replace({ pathname: '/', params: { openComments: id } });
    } else {
      router.replace('/');
    }
  }, [id]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}
