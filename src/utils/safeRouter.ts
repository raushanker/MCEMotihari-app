import { router, Href } from 'expo-router';

// Global navigation lock to prevent rapid multiple clicks pushing the same screen multiple times
let isNavigating = false;
const DEBOUNCE_MS = 500;

export const safeRouter = {
  ...router,
  push: (href: Href) => {
    if (isNavigating) return;
    isNavigating = true;
    router.push(href);
    setTimeout(() => { isNavigating = false; }, DEBOUNCE_MS);
  },
  replace: (href: Href) => {
    if (isNavigating) return;
    isNavigating = true;
    router.replace(href);
    setTimeout(() => { isNavigating = false; }, DEBOUNCE_MS);
  },
  back: () => {
    if (isNavigating) return;
    isNavigating = true;
    if (router.canGoBack()) {
      if (router.canGoBack()) { router.back(); } else { router.replace('/'); }
    }
    setTimeout(() => { isNavigating = false; }, DEBOUNCE_MS);
  }
};
