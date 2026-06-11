import { useRouter } from 'expo-router';
import { useRef, useCallback } from 'react';

const DEBOUNCE_MS = 500;

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
    if (router.canGoBack()) {
      router.back();
    }
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);
  }, [router]);

  return {
    ...router,
    push,
    replace,
    back,
  };
}
