import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './FilterSidebar.module.css';

const filterOptions = {
  categories: ['Toutes', 'Pokémon', 'One Piece', 'Magic', 'Riftbound', 'Yu-Gi-Oh'],
  priceRanges: [
    { label: 'Tous les prix', value: 'all' },
    { label: 'Moins de 50€', value: '0-50' },
    { label: '50€ - 100€', value: '50-100' },
    { label: '100€ - 500€', value: '100-500' },
    { label: 'Plus de 500€', value: '500+' },
  ],
  conditions: ['Toutes', 'Neuf', 'Excellent', 'Très bon', 'Bon'],
};

interface FilterValues {
  category: string;
  priceRange: string;
  condition: string;
}

interface FilterCallbacks {
  onCategoryChange: (category: string) => void;
  onPriceRangeChange: (range: string) => void;
  onConditionChange: (condition: string) => void;
  onReset: () => void;
}

interface FilterSidebarProps {
  filters: FilterValues;
  callbacks: FilterCallbacks;
}

export default function FilterSidebar({ filters, callbacks }: FilterSidebarProps) {
  const {
    category: selectedCategory,
    priceRange: selectedPriceRange,
    condition: selectedCondition,
  } = filters;
  const { onCategoryChange, onPriceRangeChange, onConditionChange, onReset } = callbacks;
  const [openSections, setOpenSections] = useState<string[]>(['categories', 'price']);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Gérer le montage pour le portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Bloquer le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (isMobileOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobileOpen]);

  // Fermer avec la touche Escape
  useEffect(() => {
    if (!isMobileOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const handleReset = () => {
    onReset();
    setIsMobileOpen(false);
  };

  const handleClose = () => {
    setIsMobileOpen(false);
  };

  const hasActiveFilters =
    selectedCategory !== 'Toutes' || selectedPriceRange !== 'all' || selectedCondition !== 'Toutes';

  // Contenu du drawer mobile (rendu via portal)
  const mobileDrawerContent =
    isMobileOpen && isMounted ? (
      <>
        {/* Overlay */}
        <div className={styles.mobileOverlay} onClick={handleClose} aria-hidden="true" />

        {/* Drawer */}
        <aside
          className={styles.mobileDrawer}
          role="dialog"
          aria-modal="true"
          aria-label="Filtres de recherche"
        >
          <div className={styles.drawerContent}>
            <div className={styles.header}>
              <div className={styles.headerTop}>
                <h2 className={styles.title}>Filtres</h2>
                <button
                  className={styles.mobileClose}
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Fermer les filtres"
                >
                  ✕
                </button>
              </div>
              <button onClick={handleReset} className={styles.resetButton}>
                Réinitialiser
              </button>
            </div>

            {/* Catégories */}
            <div className={styles.section}>
              <button onClick={() => toggleSection('categories')} className={styles.sectionButton}>
                <span className={styles.sectionTitle}>Catégories</span>
                <span
                  className={`${styles.chevron} ${openSections.includes('categories') ? styles.open : ''}`}
                >
                  ▼
                </span>
              </button>
              {openSections.includes('categories') && (
                <div className={styles.options}>
                  {filterOptions.categories.map((category) => (
                    <label key={category} className={styles.option}>
                      <input
                        type="radio"
                        name="category"
                        value={category}
                        checked={selectedCategory === category}
                        onChange={() => onCategoryChange(category)}
                        className={styles.radio}
                      />
                      <span className={styles.optionLabel}>{category}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Prix */}
            <div className={styles.section}>
              <button onClick={() => toggleSection('price')} className={styles.sectionButton}>
                <span className={styles.sectionTitle}>Prix</span>
                <span
                  className={`${styles.chevron} ${openSections.includes('price') ? styles.open : ''}`}
                >
                  ▼
                </span>
              </button>
              {openSections.includes('price') && (
                <div className={styles.options}>
                  {filterOptions.priceRanges.map((range) => (
                    <label key={range.value} className={styles.option}>
                      <input
                        type="radio"
                        name="price"
                        value={range.value}
                        checked={selectedPriceRange === range.value}
                        onChange={() => onPriceRangeChange(range.value)}
                        className={styles.radio}
                      />
                      <span className={styles.optionLabel}>{range.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* État */}
            <div className={styles.section}>
              <button onClick={() => toggleSection('condition')} className={styles.sectionButton}>
                <span className={styles.sectionTitle}>État</span>
                <span
                  className={`${styles.chevron} ${openSections.includes('condition') ? styles.open : ''}`}
                >
                  ▼
                </span>
              </button>
              {openSections.includes('condition') && (
                <div className={styles.options}>
                  {filterOptions.conditions.map((condition) => (
                    <label key={condition} className={styles.option}>
                      <input
                        type="radio"
                        name="condition"
                        value={condition}
                        checked={selectedCondition === condition}
                        onChange={() => onConditionChange(condition)}
                        className={styles.radio}
                      />
                      <span className={styles.optionLabel}>{condition}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </>
    ) : null;

  return (
    <>
      {/* Bouton mobile pour ouvrir le filtre */}
      <button
        className={styles.mobileToggle}
        onClick={() => setIsMobileOpen(true)}
        aria-label="Ouvrir les filtres"
        aria-expanded={isMobileOpen}
      >
        <span className={styles.mobileToggleIcon}>☰</span>
        <span className={styles.mobileToggleText}>Filtres</span>
        {hasActiveFilters && <span className={styles.filterBadge} aria-label="Filtres actifs" />}
      </button>

      {/* Sidebar desktop */}
      <aside className={styles.sidebar} aria-label="Filtres de recherche">
        <div className={styles.header}>
          <h2 className={styles.title}>Filtres</h2>
          <button onClick={onReset} className={styles.resetButton}>
            Réinitialiser
          </button>
        </div>

        {/* Catégories */}
        <div className={styles.section}>
          <button onClick={() => toggleSection('categories')} className={styles.sectionButton}>
            <span className={styles.sectionTitle}>Catégories</span>
            <span
              className={`${styles.chevron} ${openSections.includes('categories') ? styles.open : ''}`}
            >
              ▼
            </span>
          </button>
          {openSections.includes('categories') && (
            <div className={styles.options}>
              {filterOptions.categories.map((category) => (
                <label key={category} className={styles.option}>
                  <input
                    type="radio"
                    name="category"
                    value={category}
                    checked={selectedCategory === category}
                    onChange={() => onCategoryChange(category)}
                    className={styles.radio}
                  />
                  <span className={styles.optionLabel}>{category}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Prix */}
        <div className={styles.section}>
          <button onClick={() => toggleSection('price')} className={styles.sectionButton}>
            <span className={styles.sectionTitle}>Prix</span>
            <span
              className={`${styles.chevron} ${openSections.includes('price') ? styles.open : ''}`}
            >
              ▼
            </span>
          </button>
          {openSections.includes('price') && (
            <div className={styles.options}>
              {filterOptions.priceRanges.map((range) => (
                <label key={range.value} className={styles.option}>
                  <input
                    type="radio"
                    name="price"
                    value={range.value}
                    checked={selectedPriceRange === range.value}
                    onChange={() => onPriceRangeChange(range.value)}
                    className={styles.radio}
                  />
                  <span className={styles.optionLabel}>{range.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* État */}
        <div className={styles.section}>
          <button onClick={() => toggleSection('condition')} className={styles.sectionButton}>
            <span className={styles.sectionTitle}>État</span>
            <span
              className={`${styles.chevron} ${openSections.includes('condition') ? styles.open : ''}`}
            >
              ▼
            </span>
          </button>
          {openSections.includes('condition') && (
            <div className={styles.options}>
              {filterOptions.conditions.map((condition) => (
                <label key={condition} className={styles.option}>
                  <input
                    type="radio"
                    name="condition"
                    value={condition}
                    checked={selectedCondition === condition}
                    onChange={() => onConditionChange(condition)}
                    className={styles.radio}
                  />
                  <span className={styles.optionLabel}>{condition}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Drawer mobile via portal */}
      {isMounted && createPortal(mobileDrawerContent, document.body)}
    </>
  );
}
