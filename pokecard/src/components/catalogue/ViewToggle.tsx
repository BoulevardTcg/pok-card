import type { ViewMode } from '../../hooks/useViewPreference';
import styles from './ViewToggle.module.css';

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

// Icône Grille
const GridIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

// Icône Liste
const ListIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className={styles.viewToggle} role="group" aria-label="Mode d'affichage">
      <button
        className={`${styles.toggleButton} ${view === 'grid' ? styles.active : ''}`}
        onClick={() => onChange('grid')}
        aria-label="Vue grille"
        aria-pressed={view === 'grid'}
      >
        <GridIcon />
        <span className={styles.desktopOnly}>Grille</span>
      </button>
      <button
        className={`${styles.toggleButton} ${view === 'list' ? styles.active : ''}`}
        onClick={() => onChange('list')}
        aria-label="Vue liste"
        aria-pressed={view === 'list'}
      >
        <ListIcon />
        <span className={styles.desktopOnly}>Liste</span>
      </button>
    </div>
  );
}
