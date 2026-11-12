import { createContext, useContext } from 'react';

export type AccentTheme = 'gold' | 'cyber' | 'emerald' | 'sapphire' | 'sunset' | 'rose' | 'arctic' | 'crimson' | 'violet';

export interface ThemeSettingsState {
  accent: AccentTheme;
  setAccent: (theme: AccentTheme) => void;
  clientCompression: boolean;
  setClientCompression: (enabled: boolean) => void;
  compressionQuality: number;
  setCompressionQuality: (q: number) => void;
  maxDimension: number;
  setMaxDimension: (dim: number) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;
  isOnline: boolean;
  hapticFeedback: boolean;
  setHapticFeedback: (enabled: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const ThemeSettingsContext = createContext<ThemeSettingsState | undefined>(undefined);

export function useThemeSettings(): ThemeSettingsState {
  const context = useContext(ThemeSettingsContext);
  if (!context) {
    throw new Error('useThemeSettings must be used within a ThemeSettingsProvider');
  }
  return context;
}

