import { useContext } from 'react';
import { DarkModeContext } from '../contexts/darkModeTypes';

/**
 * Hook pour utiliser le contexte dark mode
 * @throws {Error} Si utilisé en dehors d'un DarkModeProvider
 */
export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}
