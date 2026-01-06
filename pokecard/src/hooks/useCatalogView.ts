import { useState, useEffect, useMemo } from 'react';
import type { CatalogViewMode } from '../components/landing/CatalogViewToggle';

const STORAGE_KEY = 'catalog-view-mode';
const STORAGE_KEY_FORCED = 'catalog-view-forced';

export function useCatalogView(searchQuery: string, hasActiveFilters: boolean) {
  const [forcedMode, setForcedMode] = useState<CatalogViewMode | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_FORCED);
    return (stored as CatalogViewMode) || null;
  });

  const smartMode = useMemo<CatalogViewMode>(() => {
    if (forcedMode) return forcedMode;
    if (searchQuery.trim() || hasActiveFilters) return 'dense';
    return 'grid';
  }, [searchQuery, hasActiveFilters, forcedMode]);

  const [currentMode, setCurrentMode] = useState<CatalogViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as CatalogViewMode) || smartMode;
  });

  useEffect(() => {
    if (!forcedMode) {
      setCurrentMode(smartMode);
    }
  }, [smartMode, forcedMode]);

  const handleModeChange = (mode: CatalogViewMode) => {
    setForcedMode(mode);
    setCurrentMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    localStorage.setItem(STORAGE_KEY_FORCED, mode);
  };

  return {
    mode: currentMode,
    setMode: handleModeChange,
    isForced: forcedMode !== null,
  };
}
