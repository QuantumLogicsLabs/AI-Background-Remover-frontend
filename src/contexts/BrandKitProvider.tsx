import { useState, useEffect, ReactNode } from 'react';
import {
  BrandKitContext,
  defaultBrandKit,
  type BrandKitState,
  type ExportFormat,
  type WatermarkSettings,
} from './BrandKitContext';

export function BrandKitProvider({ children }: { children: ReactNode }) {
  const [brandKit, setBrandKitState] = useState<BrandKitState>(() => {
    const saved = localStorage.getItem('brandKit');
    if (saved) {
      try {
        return { ...defaultBrandKit, ...JSON.parse(saved) };
      } catch (_e) {
        // localStorage value is corrupt — fall back to defaults
      }
    }
    return defaultBrandKit;
  });

  useEffect(() => {
    localStorage.setItem('brandKit', JSON.stringify(brandKit));
  }, [brandKit]);

  const setBrandKit = (updater: (prev: BrandKitState) => BrandKitState) => {
    setBrandKitState(updater);
  };

  const addColor = (color: string) => {
    setBrandKit((prev) => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors : [...prev.colors, color],
    }));
  };

  const removeColor = (color: string) => {
    setBrandKit((prev) => ({
      ...prev,
      colors: prev.colors.filter((c) => c !== color),
    }));
  };

  const setDefaultExportFormat = (format: ExportFormat) => {
    setBrandKit((prev) => ({ ...prev, defaultExportFormat: format }));
  };

  const updateWatermark = (settings: Partial<WatermarkSettings>) => {
    setBrandKit((prev) => ({
      ...prev,
      watermark: { ...prev.watermark, ...settings },
    }));
  };

  return (
    <BrandKitContext.Provider
      value={{
        brandKit,
        setBrandKit,
        addColor,
        removeColor,
        setDefaultExportFormat,
        updateWatermark,
      }}
    >
      {children}
    </BrandKitContext.Provider>
  );
}

