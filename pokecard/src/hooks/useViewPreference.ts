import { useState, useEffect } from 'react';

export type ViewMode = 'grid' | 'list';

const STORAGE_KEY = 'catalog-view';

export function useViewPreference(
  defaultView: ViewMode = 'grid'
): [ViewMode, (view: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return defaultView;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'grid' || saved === 'list' ? saved : defaultView;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  return [view, setView];
}
