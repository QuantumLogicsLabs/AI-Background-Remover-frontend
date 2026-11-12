import { useState } from 'react';

interface EnhancedColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  showAlpha?: boolean;
}

const PALETTES = {
  Luxury: ['#F59E0B', '#D97706', '#B45309', '#FDE68A', '#1C1917', '#292524', '#78350F'],
  Cyber: ['#EC4899', '#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F43F5E', '#A855F7'],
  Pastel: ['#FECDD3', '#FDE68A', '#A7F3D0', '#BAE6FD', '#DDD6FE', '#F5D0FE', '#E2E8F0'],
  Studio: ['#FFFFFF', '#F8FAFC', '#E2E8F0', '#94A3B8', '#475569', '#1E293B', '#090A0F'],
  Vibrant: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6'],
};

interface EyeDropperInstance {
  open: () => Promise<{ sRGBHex?: string }>
}

interface WindowWithEyeDropper extends Window {
  EyeDropper?: new () => EyeDropperInstance
}

export default function EnhancedColorPicker({
  color,
  onChange,
  label = 'Color',
}: EnhancedColorPickerProps) {
  const [activeTab, setActiveTab] = useState<keyof typeof PALETTES>('Luxury');
  const [isEyedropperSupported] = useState<boolean>(() => 'EyeDropper' in window);

  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const EyeDropperClass = (window as unknown as WindowWithEyeDropper).EyeDropper;
        if (!EyeDropperClass) return;
        const eyeDropper = new EyeDropperClass();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          onChange(result.sRGBHex);
        }
      } catch (_e) {
        // User cancelled or eyedropper failed
      }
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-surface-raised border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {isEyedropperSupported && (
            <button
              type="button"
              onClick={handleEyedropper}
              className="p-1.5 rounded-lg border border-border bg-surface hover:border-border-strong text-secondary hover:text-primary transition-colors text-xs flex items-center gap-1"
              title="Pick color from screen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.684a1 1 0 01-.633-.632L6.95 5.684z" />
              </svg>
              <span className="text-[11px] font-medium">Sample</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface border border-border">
            <span
              className="w-4 h-4 rounded-full border border-black/15 shadow-inner"
              style={{ backgroundColor: color }}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="w-16 font-mono text-xs text-primary bg-transparent focus:outline-none uppercase"
              maxLength={9}
            />
            <input
              type="color"
              value={color.startsWith('#') && color.length === 7 ? color : '#ffffff'}
              onChange={(e) => onChange(e.target.value)}
              className="w-5 h-5 opacity-0 absolute cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Palette tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto">
        {(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeTab === tab
                ? 'bg-magenta/15 text-magenta font-semibold'
                : 'text-muted hover:text-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Color Swatches */}
      <div className="grid grid-cols-7 gap-1.5">
        {PALETTES[activeTab].map((swatch) => {
          const isSelected = color.toLowerCase() === swatch.toLowerCase();
          return (
            <button
              key={swatch}
              type="button"
              onClick={() => onChange(swatch)}
              className={`group relative aspect-square rounded-lg border transition-all duration-150 ${
                isSelected
                  ? 'border-magenta scale-110 shadow-md ring-2 ring-magenta/40'
                  : 'border-border/60 hover:scale-105 hover:border-border-strong'
              }`}
              style={{ backgroundColor: swatch }}
              title={swatch}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
