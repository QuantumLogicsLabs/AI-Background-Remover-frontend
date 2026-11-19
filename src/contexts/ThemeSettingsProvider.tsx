import { useState, useEffect, ReactNode } from "react";
import { subscribeToOnlineStatus } from "../services/pwaService";
import { ThemeSettingsContext, normalizeAccent } from "./ThemeSettingsContext";
import type { AccentTheme } from "./ThemeSettingsContext";

const ACCENT_KEY = "ai_bg_accent_theme";
const COMPRESSION_KEY = "ai_bg_compression_enabled";
const QUALITY_KEY = "ai_bg_compression_quality";
const MAX_DIM_KEY = "ai_bg_max_dimension";
const HAPTIC_KEY = "ai_bg_haptic";
const SIDEBAR_KEY = "ai_bg_sidebar_open";

// Read a number from localStorage, ignoring junk ("abc", "NaN", out of range) so a
// corrupted value can never reach the image compressor.
function readNumber(
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

export function ThemeSettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentTheme>(() => {
    return normalizeAccent(localStorage.getItem(ACCENT_KEY));
  });

  const [clientCompression, setClientCompressionState] = useState<boolean>(
    () => {
      const saved = localStorage.getItem(COMPRESSION_KEY);
      return saved !== null ? saved === "true" : true;
    },
  );

  const [compressionQuality, setCompressionQualityState] = useState<number>(
    () => readNumber(QUALITY_KEY, 0.92, 0.1, 1),
  );

  const [maxDimension, setMaxDimensionState] = useState<number>(() =>
    readNumber(MAX_DIM_KEY, 2500, 100, 10000),
  );

  const [hapticFeedback, setHapticFeedbackState] = useState<boolean>(() => {
    return localStorage.getItem(HAPTIC_KEY) === "true";
  });

  const [sidebarOpen, setSidebarOpenState] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    return saved !== null ? saved === "true" : true;
  });

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const root = document.documentElement;
    // Never apply accent overrides on auth pages — they use a fixed violet palette
    if (root.hasAttribute("data-auth-page")) return;
    root.setAttribute("data-accent", accent);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent]);

  // When navigating away from an auth page, reapply the saved accent
  useEffect(() => {
    const handler = () => {
      const root = document.documentElement;
      if (!root.hasAttribute("data-auth-page")) {
        root.setAttribute("data-accent", accent);
      }
    };
    window.addEventListener("reapply-accent", handler);
    return () => window.removeEventListener("reapply-accent", handler);
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
