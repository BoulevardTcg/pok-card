import { useContext } from 'react';
import { ThemeContext, type ThemeContextType } from './ThemeContextDef';

/**
 * Hook pour accéder au contexte de thème
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
