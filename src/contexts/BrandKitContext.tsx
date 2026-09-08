import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ExportFormat = 'png' | 'jpeg' | 'webp';
export type WatermarkType = 'text' | 'image';

export interface WatermarkSettings {
  enabled: boolean;
  type: WatermarkType;
  text: string;
  image: string; // base64 data url
  opacity: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
}

export interface BrandKitState {
  colors: string[];
  defaultExportFormat: ExportFormat;
  watermark: WatermarkSettings;
}

interface BrandKitContextType {
  brandKit: BrandKitState;
  setBrandKit: (updater: (prev: BrandKitState) => BrandKitState) => void;
  addColor: (color: string) => void;
  removeColor: (color: string) => void;
  setDefaultExportFormat: (format: ExportFormat) => void;
  updateWatermark: (settings: Partial<WatermarkSettings>) => void;
}

const defaultBrandKit: BrandKitState = {
  colors: ['#EC4899', '#3B82F6', '#10B981', '#F59E0B'],
  defaultExportFormat: 'png',
  watermark: {
    enabled: false,
    type: 'text',
    text: '� MyBrand',
    image: '',
    opacity: 0.8,
    position: 'bottom-right',
  },
};

const BrandKitContext = createContext<BrandKitContextType | undefined>(undefined);

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

export function useBrandKit() {
  const context = useContext(BrandKitContext);
  if (context === undefined) {
    throw new Error('useBrandKit must be used within a BrandKitProvider');
  }
  return context;
}
