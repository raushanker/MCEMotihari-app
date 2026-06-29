import { useRouter } from 'expo-router';
import { useRef, useCallback } from 'react';

const DEBOUNCE_MS = 500;

export const historyStack: string[] = [];

export function useSafeRouter() {
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  const push = useCallback((href: Parameters<typeof router.push>[0]) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push(href);
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);
  }, [router]);

  const replace = useCallback((href: Parameters<typeof router.replace>[0]) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.replace(href);
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);
  }, [router]);

  const back = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    if (historyStack.length > 1) {
      const popped = historyStack.pop(); // Pop current route
      const prevRoute = historyStack[historyStack.length - 1];
      
      // Reopen explore menu modal if popped route came from explore
      if (popped && popped.includes('from=explore')) {
        try {
          const { useAppStore } = require('@/store/useAppStore');
          useAppStore.getState().setExploreActiveView('hub');
          useAppStore.getState().setExploreMenuVisible(true);
        } catch (e) {
          console.warn('Failed to reopen explore menu modal:', e);
        }
      }
      
      router.replace(prevRoute as any);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }

    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);
  }, [router]);

  const canGoBack = useCallback(() => {
    return historyStack.length > 1 || router.canGoBack();
  }, [router]);

  return {
    ...router,
    push,
    replace,
    back,
    canGoBack,
  };
}
