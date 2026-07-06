const fs = require('fs');
const path = require('path');

const routerPath = path.join(__dirname, 'src', 'hooks', 'useSafeRouter.ts');
let content = fs.readFileSync(routerPath, 'utf8');

// Ensure useLocalSearchParams is imported
if (!content.includes('useLocalSearchParams')) {
  content = content.replace("import { useRouter } from 'expo-router';", "import { useRouter, useLocalSearchParams } from 'expo-router';");
}

// Add params to the hook
if (!content.includes('const params = useLocalSearchParams();')) {
  content = content.replace("const isNavigatingRef = useRef(false);", "const params = useLocalSearchParams();\n  const isNavigatingRef = useRef(false);");
}

// Replace the back logic
const backSearch = `  const back = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    if (historyStack.length > 1) {
      const popped = historyStack.pop(); // Pop current route
      const prevRoute = historyStack[historyStack.length - 1];
      
      // Reopen explore menu modal if popped route came from explore
      if (popped && popped.includes('from=explore')) {
        try {
          const { useAppStore } = require('@/store/useAppStore');
          const match = popped.match(/exploreView=([^&]+)/);
          const exploreView = match ? match[1] : 'hub';
          useAppStore.getState().setExploreActiveView(exploreView);
          
          // Delay opening the modal slightly to allow the underlying route transition to start
          setTimeout(() => {
            useAppStore.getState().setExploreMenuVisible(true);
          }, 150);
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
  }, [router]);`;

const backReplace = `  const back = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    const isFromExplore = params && params.from === 'explore';
    const exploreView = params && params.exploreView ? String(params.exploreView) : 'hub';

    if (historyStack.length > 1) {
      historyStack.pop(); // Pop current
      const prevRoute = historyStack[historyStack.length - 1];
      router.replace(prevRoute as any);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }

    if (isFromExplore) {
      try {
        const { useAppStore } = require('@/store/useAppStore');
        // Delay opening the modal slightly to allow the underlying route transition to start
        setTimeout(() => {
          useAppStore.getState().setExploreActiveView(exploreView as any);
          useAppStore.getState().setExploreMenuVisible(true);
        }, 150);
      } catch (e) {
        console.warn('Failed to reopen explore menu modal:', e);
      }
    }

    setTimeout(() => { isNavigatingRef.current = false; }, DEBOUNCE_MS);
  }, [router, params]);`;

if (content.includes("const back = useCallback(() => {")) {
  const startIndex = content.indexOf("const back = useCallback(() => {");
  const endIndex = content.indexOf("  }, [router]);", startIndex) + "  }, [router]);".length;
  content = content.substring(0, startIndex) + backReplace + content.substring(endIndex);
}

fs.writeFileSync(routerPath, content, 'utf8');
console.log('Patched useSafeRouter.ts completely');
