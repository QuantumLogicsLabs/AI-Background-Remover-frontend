import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subscribeToOnlineStatus } from '../services/pwaService';

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

const ACCENT_KEY = 'ai_bg_accent_theme';
const COMPRESSION_KEY = 'ai_bg_compression_enabled';
const QUALITY_KEY = 'ai_bg_compression_quality';
const MAX_DIM_KEY = 'ai_bg_max_dimension';
const HAPTIC_KEY = 'ai_bg_haptic';
const SIDEBAR_KEY = 'ai_bg_sidebar_open';

const ThemeSettingsContext = createContext<ThemeSettingsState | undefined>(undefined);

export function ThemeSettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentTheme>(() => {
    return (localStorage.getItem(ACCENT_KEY) as AccentTheme) || 'gold';
  });

  const [clientCompression, setClientCompressionState] = useState<boolean>(() => {
    const saved = localStorage.getItem(COMPRESSION_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [compressionQuality, setCompressionQualityState] = useState<number>(() => {
    const saved = localStorage.getItem(QUALITY_KEY);
    return saved ? parseFloat(saved) : 0.92;
  });

  const [maxDimension, setMaxDimensionState] = useState<number>(() => {
    const saved = localStorage.getItem(MAX_DIM_KEY);
    return saved ? parseInt(saved, 10) : 2500;
  });

  const [hapticFeedback, setHapticFeedbackState] = useState<boolean>(() => {
    return localStorage.getItem(HAPTIC_KEY) === 'true';
  });

  const [sidebarOpen, setSidebarOpenState] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-accent', accent);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent]);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  const setAccent = (newAccent: AccentTheme) => {
    setAccentState(newAccent);
  };

  const setClientCompression = (enabled: boolean) => {
    setClientCompressionState(enabled);
    localStorage.setItem(COMPRESSION_KEY, String(enabled));
  };

  const setCompressionQuality = (q: number) => {
    setCompressionQualityState(q);
    localStorage.setItem(QUALITY_KEY, String(q));
  };

  const setMaxDimension = (dim: number) => {
    setMaxDimensionState(dim);
    localStorage.setItem(MAX_DIM_KEY, String(dim));
  };

  const setHapticFeedback = (enabled: boolean) => {
    setHapticFeedbackState(enabled);
    localStorage.setItem(HAPTIC_KEY, String(enabled));
  };

  const setSidebarOpen = (open: boolean) => {
    setSidebarOpenState(open);
    localStorage.setItem(SIDEBAR_KEY, String(open));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeSettingsContext.Provider
      value={{
        accent,
        setAccent,
        clientCompression,
        setClientCompression,
        compressionQuality,
        setCompressionQuality,
        maxDimension,
        setMaxDimension,
        isShortcutsOpen,
        setIsShortcutsOpen,
        isOnline,
        hapticFeedback,
        setHapticFeedback,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </ThemeSettingsContext.Provider>
  );
}

export function useThemeSettings(): ThemeSettingsState {
  const context = useContext(ThemeSettingsContext);
  if (!context) {
    throw new Error('useThemeSettings must be used within a ThemeSettingsProvider');
  }
  return context;
}
