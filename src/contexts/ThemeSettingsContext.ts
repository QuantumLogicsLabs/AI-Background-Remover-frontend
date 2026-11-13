import { createContext, useContext } from 'react';

export const ACCENT_OPTIONS = [
  { id: 'sapphire', name: 'Sapphire', pair: 'Blue + Indigo',    desc: 'Cool & focused',     primary: '#3B82F6', secondary: '#6366F1' },
  { id: 'cyber',    name: 'Cyber',    pair: 'Magenta + Violet', desc: 'Bold & electric',    primary: '#EC4899', secondary: '#8B5CF6' },
  { id: 'gold',     name: 'Amber',    pair: 'Amber + Orange',   desc: 'Warm darkroom glow', primary: '#F59E0B', secondary: '#F97316' },
  { id: 'emerald',  name: 'Emerald',  pair: 'Green + Cyan',     desc: 'Fresh & crisp',      primary: '#10B981', secondary: '#06B6D4' },
] as const;

export type AccentTheme = typeof ACCENT_OPTIONS[number]['id'];

export const DEFAULT_ACCENT: AccentTheme = 'gold';

// Users who picked a since-removed theme are moved to the closest remaining one.
const LEGACY_ACCENTS: Record<string, AccentTheme> = {
  sunset:  'gold',
  rose:    'cyber',
  crimson: 'cyber',
  violet:  'cyber',
  arctic:  'sapphire',
};

export function normalizeAccent(value: string | null | undefined): AccentTheme {
  if (!value) return DEFAULT_ACCENT;
  if (ACCENT_OPTIONS.some(o => o.id === value)) return value as AccentTheme;
  return LEGACY_ACCENTS[value] ?? DEFAULT_ACCENT;
}

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

