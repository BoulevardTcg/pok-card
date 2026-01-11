import { createContext } from 'react';

export type Theme = 'dark' | 'light';

export type DarkModeContextType = {
  isDark: boolean;
  toggleDarkMode: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);
