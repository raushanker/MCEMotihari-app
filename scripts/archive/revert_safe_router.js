const fs = require('fs');
const path = require('path');

const routerPath = path.join(__dirname, 'src', 'hooks', 'useSafeRouter.ts');
const cleanContent = `import { useRouter } from 'expo-router';
import { useRef, useCallback } from 'react';

const DEBOUNCE_MS = 500;

export const historyStack: string[] = [];

export function useSafeRouter() {
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  const push = useCallback((href: Parameters<typeof router.push>[0]) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    historyStack.push(String(href));
    router.push(href);
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);
  }, [router]);

  const replace = useCallback((href: Parameters<typeof router.replace>[0]) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    if (historyStack.length > 0) {
      historyStack[historyStack.length - 1] = String(href);
    } else {
      historyStack.push(String(href));
    }
    router.replace(href);
    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);
  }, [router]);

  const back = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    if (historyStack.length > 1) {
      historyStack.pop(); // Pop current
      // Natively pop the stack instead of replacing to preserve animation
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(historyStack[historyStack.length - 1] as any);
      }
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
`;

fs.writeFileSync(routerPath, cleanContent, 'utf8');
console.log('Reverted useSafeRouter.ts');
