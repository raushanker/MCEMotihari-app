import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function ExploreRedirectScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  
  useEffect(() => {
    const view = params.view;
    let storeView: any = 'hub';
    
    if (view === 'departments') storeView = 'departments';
    else if (view === 'faculty' || view === 'faculty-list') storeView = 'faculty-list';
    else if (view === 'syllabus') storeView = 'syllabus';
    else if (view === 'hostels') storeView = 'hostels';
    
    useAppStore.getState().setExploreActiveView(storeView);
    useAppStore.getState().setExploreMenuVisible(true);
  }, [params.view]);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
