import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeSettings } from '../contexts/ThemeSettingsContext';

export interface ShortcutItem {
  key: string;
  description: string;
  category: 'Navigation' | 'Actions' | 'View';
}

export const SHORTCUT_LIST: ShortcutItem[] = [
  { key: '?', description: 'Open keyboard shortcuts cheatsheet', category: 'View' },
  { key: 'Ctrl + /', description: 'Toggle shortcuts cheatsheet', category: 'View' },
  { key: '1', description: 'Go to Remove/Replace BG', category: 'Navigation' },
  { key: '2', description: 'Go to Enhance', category: 'Navigation' },
  { key: '3', description: 'Go to Shadow/Glow', category: 'Navigation' },
  { key: '4', description: 'Go to Recolor & Eraser', category: 'Navigation' },
  { key: '5', description: 'Go to Smart Crop', category: 'Navigation' },
  { key: '6', description: 'Go to Batch Processor', category: 'Navigation' },
  { key: '7', description: 'Go to History Gallery', category: 'Navigation' },
  { key: 'Esc', description: 'Go to Login / Sign up page', category: 'Navigation' },
];

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isShortcutsOpen, setIsShortcutsOpen } = useThemeSettings();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing into an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Handle '?' or 'Ctrl+/'
      if ((e.key === '?' && !isInput) || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(!isShortcutsOpen);
        return;
      }

      if (isInput) return;

      // Number keys for navigation
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
          case '1':
            navigate('/');
            break;
          case '2':
            navigate('/enhance');
            break;
          case '3':
            navigate('/shadow');
            break;
          case '4':
            navigate('/recolor-and-eraser');
            break;
          case '5':
            navigate('/smart-crop');
            break;
          case '6':
            navigate('/batch');
            break;
          case '7':
            navigate('/history');
            break;
          case 'Escape':
            e.preventDefault();
            if (isShortcutsOpen) {
              setIsShortcutsOpen(false);
            }
            if (location.pathname === '/login') {
              navigate('/register');
            } else {
              navigate('/login');
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname, isShortcutsOpen, setIsShortcutsOpen]);
}
