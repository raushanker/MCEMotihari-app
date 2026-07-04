import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export function useExploreBack() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const setExploreMenuVisible = useAppStore(state => state.setExploreMenuVisible);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
    
    if (from === 'explore') {
      setTimeout(() => {
        setExploreMenuVisible(true);
      }, 100);
    }
  };

  return handleBack;
}
