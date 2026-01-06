import styles from './CatalogViewToggle.module.css';

export type CatalogViewMode = 'grid' | 'dense' | 'expand';

type Props = {
  mode: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
};

export function CatalogViewToggle({ mode, onChange }: Props) {
  return (
    <div className={styles.toggle} role="group" aria-label="Changer la vue du catalogue">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`${styles.button} ${mode === 'grid' ? styles.active : ''}`}
        aria-label="Vue grille compacte"
        aria-pressed={mode === 'grid'}
        title="Grille compacte"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="12" y="3" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="12" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="12" y="12" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('dense')}
        className={`${styles.button} ${mode === 'dense' ? styles.active : ''}`}
        aria-label="Vue liste dense"
        aria-pressed={mode === 'dense'}
        title="Liste dense"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <line
            x1="3"
            y1="4"
            x2="17"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="3"
            y1="10"
            x2="17"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="3"
            y1="16"
            x2="17"
            y2="16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('expand')}
        className={`${styles.button} ${mode === 'expand' ? styles.active : ''}`}
        aria-label="Vue liste enrichie"
        aria-pressed={mode === 'expand'}
        title="Liste enrichie"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <line
            x1="3"
            y1="4"
            x2="17"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="3"
            y1="10"
            x2="17"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="3"
            y1="16"
            x2="17"
            y2="16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="14" cy="4" r="2" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
