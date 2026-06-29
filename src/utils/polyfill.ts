import { BackHandler } from 'react-native';

// Polyfill BackHandler.removeEventListener for modern React Native compatibility
if (BackHandler && !(BackHandler as any).removeEventListener) {
  (BackHandler as any).removeEventListener = (eventName: string, handler: any) => {
    if (__DEV__) {
      console.log(`[BackHandler Polyfill] Safely ignored removeEventListener for ${eventName}`);
    }
  };
}

// Polyfill console.time and console.timeEnd to prevent Hermes crashes in production
if (typeof console.time !== 'function') {
  console.time = () => {};
}
if (typeof console.timeEnd !== 'function') {
  console.timeEnd = () => {};
}
