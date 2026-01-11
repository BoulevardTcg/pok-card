import { useEffect, useState, useCallback, useMemo } from 'react';
import { ThemeContext, type Theme, type ThemeContextType } from './ThemeContextDef';

export type { Theme, ThemeContextType } from './ThemeContextDef';

const STORAGE_KEY = 'boulevard-theme';

/**
 * Détecte la préférence système de l'utilisateur
 */
function getSystemPreference(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Récupère le thème initial depuis localStorage ou la préférence système
 */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    // localStorage non disponible
  }

  return getSystemPreference();
}

/**
 * Applique le thème au document HTML
 */
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => defaultTheme ?? getInitialTheme());
  const [mounted, setMounted] = useState(false);

  // Appliquer le thème au montage côté client
  useEffect(() => {
    setMounted(true);
    const initialTheme = defaultTheme ?? getInitialTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, [defaultTheme]);

  // Écouter les changements de préférence système
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Ne changer que si l'utilisateur n'a pas de préférence enregistrée
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          const newTheme = e.matches ? 'dark' : 'light';
          setThemeState(newTheme);
          applyTheme(newTheme);
        }
      } catch {
        // Ignorer si localStorage non disponible
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage non disponible
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
