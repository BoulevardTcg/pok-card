import { createContext } from 'react';

export type DarkModeContextType = {
  isDark: boolean;
  toggleDarkMode: () => void;
};

export const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);
