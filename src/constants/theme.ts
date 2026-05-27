import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111827', // Slate-900
    background: '#F8FAFC', // Slate-50 app background
    backgroundElement: '#FFFFFF', // Card Background
    backgroundSelected: '#E2E8F0', // Border-selected
    textSecondary: '#6B7280', // Slate-500
    primary: '#0F172A', // Dark Navy
    accent: '#F97316', // Orange Accent
    mcean: '#FAF5FF', // Soft purple tint
    alumni: '#F0F9FF', // Soft blue tint
    cardBorder: '#E2E8F0', // Light grey border
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A', // Dark Navy
    backgroundElement: '#1E293B', // Dark slate surface
    backgroundSelected: '#334155',
    textSecondary: '#94A3B8',
    primary: '#1E293B',
    accent: '#F97316',
    mcean: '#A855F7',
    alumni: '#3B82F6',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
