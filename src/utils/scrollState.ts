import { Animated } from 'react-native';

// Global animated value to sync scroll position between Home Feed (index.tsx) and Tab Bar (_layout.tsx)
export const feedScrollY = new Animated.Value(0);

// Clamped value to prevent rubber-band (negative scroll) from hiding the header/footer at the top
export const clampedScrollY = feedScrollY.interpolate({
  inputRange: [0, 10000],
  outputRange: [0, 10000],
  extrapolateLeft: 'clamp',
});
