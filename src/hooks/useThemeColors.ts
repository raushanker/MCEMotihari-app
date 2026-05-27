import { useColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { Colors } from '@/constants/theme';

export function useThemeColors() {
  const systemScheme = useColorScheme();
  const themePreference = useAppStore(state => state.themePreference);
  
  const activeTheme = themePreference === 'system' 
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themePreference;
    
  return {
    ...Colors[activeTheme],
    isDark: activeTheme === 'dark',
    activeTheme
  };
}

export default useThemeColors;
