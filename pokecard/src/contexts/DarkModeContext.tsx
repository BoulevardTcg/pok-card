import { createContext, useEffect, useState } from 'react';

type DarkModeContextType = {
  isDark: boolean;
  toggleDarkMode: () => void;
};

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Récupérer la préférence depuis localStorage
    const saved = localStorage.getItem('darkMode');
    if (saved) {
      setIsDark(saved === 'true');
    } else {
      // Vérifier la préférence système
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      // Appliquer la classe dark au document
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  }, [isDark, mounted]);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  // Toujours fournir le contexte, même si pas encore monté (pour éviter les erreurs SSR)
  return (
    <DarkModeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

