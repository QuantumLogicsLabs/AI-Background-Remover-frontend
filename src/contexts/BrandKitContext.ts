import { createContext, useContext } from 'react';

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

export interface BrandKitContextType {
  brandKit: BrandKitState;
  setBrandKit: (updater: (prev: BrandKitState) => BrandKitState) => void;
  addColor: (color: string) => void;
  removeColor: (color: string) => void;
  setDefaultExportFormat: (format: ExportFormat) => void;
  updateWatermark: (settings: Partial<WatermarkSettings>) => void;
}

export const defaultBrandKit: BrandKitState = {
  colors: ['#EC4899', '#3B82F6', '#10B981', '#F59E0B'],
  defaultExportFormat: 'png',
  watermark: {
    enabled: false,
    type: 'text',
    text: '✨ MyBrand',
    image: '',
    opacity: 0.8,
    position: 'bottom-right',
  },
};

export const BrandKitContext = createContext<BrandKitContextType | undefined>(undefined);

export function useBrandKit() {
  const context = useContext(BrandKitContext);
  if (context === undefined) {
    throw new Error('useBrandKit must be used within a BrandKitProvider');
  }
  return context;
}

