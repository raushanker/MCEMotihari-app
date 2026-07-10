import { useCallback } from 'react';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';


/**
 * useExploreBack
 * Handles back navigation for screens opened from the Explore modal.
 * Since ExploreMenuModal is rendered in `(tabs)/_layout.tsx`, pushing a full-screen route
 * from it will push ON TOP of the tabs (including the open ExploreMenuModal).
 * So returning is as simple as going back!
 */
export function useExploreBack() {
  const router = useRouter();

  return useCallback((from?: string) => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);
}
