import { Animated } from 'react-native';

// Global animated value to sync scroll position between Home Feed (index.tsx) and Tab Bar (_layout.tsx)
export const feedScrollY = new Animated.Value(0);

// Clamped value to prevent rubber-band (negative scroll) from hiding the header/footer at the top.
// Uses interpolation to clamp at 0, preventing negative values from pull-to-refresh.
export const clampedScrollY = feedScrollY.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 1],
  extrapolateLeft: 'clamp',
  extrapolateRight: 'extend',
});
