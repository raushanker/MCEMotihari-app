import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

// This screen intercepts direct /explore?view=... routes from the drawer, 
// sets the appropriate view in Zustand, triggers the modal visibility, 
// and immediately routes back/home to avoid showing a white screen.
export default function ExploreRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  
  useEffect(() => {
    const view = params.view;
    let storeView: any = 'hub';
    
    if (view === 'departments') storeView = 'departments';
    else if (view === 'faculty' || view === 'faculty-list') storeView = 'faculty-list';
    else if (view === 'syllabus') storeView = 'syllabus';
    else if (view === 'hostels') storeView = 'hostels';
    
    // Set view in store and open the modal
    useAppStore.getState().setExploreActiveView(storeView);
    useAppStore.getState().setExploreMenuVisible(true);
    
    // Immediately navigate back to avoid showing a white screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [params.view]);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
