import { useContext } from 'react';
import { DarkModeContext, type DarkModeContextType } from './DarkModeContextDef';

/**
 * Hook pour accéder au contexte de thème
 */
export function useDarkMode(): DarkModeContextType {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}
