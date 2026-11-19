import { useState } from "react";
import { useThemeSettings } from "../contexts/ThemeSettingsContext";
import { SHORTCUT_LIST, ShortcutItem } from "../hooks/useKeyboardShortcuts";

export default function ShortcutsModal() {
  const { isShortcutsOpen, setIsShortcutsOpen } = useThemeSettings();
  const [filter, setFilter] = useState("");

  if (!isShortcutsOpen) return null;

  const filtered = SHORTCUT_LIST.filter(
    (s) =>
      s.key.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase()) ||
      s.category.toLowerCase().includes(filter.toLowerCase()),
  );

  const categories = ["Navigation", "Actions", "View"] as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
      onClick={() => setIsShortcutsOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden glass-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-magenta/15 text-magenta flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M2 4.75C2 3.784 2.784 3 3.75 3h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0116.25 17H3.75A1.75 1.75 0 012 15.25V4.75zM4 6.5a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 014 6.5zm4 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 018 6.5zm4 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0112 6.5zm-8 4a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm4 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm4 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM4.75 13.5a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H4.75z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2
                id="shortcuts-title"
                className="text-base font-bold text-primary"
              >
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-muted">
                Quick commands for power users
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsShortcutsOpen(false)}
            className="p-1.5 rounded-lg border border-border hover:border-border-strong text-muted hover:text-primary transition-colors"
            aria-label="Close shortcuts dialog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-border bg-surface-raised">
          <input
            type="text"
            placeholder="Search shortcuts…"
            aria-label="Search shortcuts"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-xs text-primary placeholder:text-muted focus:outline-none focus:border-magenta"
          />
        </div>

        {/* Shortcut Groups */}
        <div className="max-h-[60vh] overflow-y-auto p-5 space-y-5">
          {categories.map((cat) => {
            const items = filtered.filter((s) => s.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted px-1">
                  {cat}
                </h3>
                <div className="rounded-xl border border-border divide-y divide-border bg-surface">
                  {items.map((item: ShortcutItem) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-surface-raised/60 transition-colors"
                    >
                      <span className="text-secondary font-medium">
                        {item.description}
                      </span>
                      <kbd className="px-2 py-1 font-mono text-[11px] font-medium bg-surface-raised border border-border-strong text-primary rounded shadow-sm">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-surface-raised flex items-center justify-between text-xs text-muted">
          <span>
            Press{" "}
            <kbd className="px-1.5 py-0.5 font-mono bg-surface border border-border rounded text-[10px]">
              Esc
            </kbd>{" "}
            to close
          </span>
          <span>
            Tip: Press{" "}
            <kbd className="px-1.5 py-0.5 font-mono bg-surface border border-border rounded text-[10px]">
              ?
            </kbd>{" "}
            anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
