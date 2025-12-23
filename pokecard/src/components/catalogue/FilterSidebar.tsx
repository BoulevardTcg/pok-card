import { useState } from 'react';
import styles from './FilterSidebar.module.css';

const filters = {
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

export default function FilterSidebar({
  filters,
  callbacks,
}: FilterSidebarProps) {
  const { category: selectedCategory, priceRange: selectedPriceRange, condition: selectedCondition } = filters;
  const { onCategoryChange, onPriceRangeChange, onConditionChange, onReset } = callbacks;
  const [openSections, setOpenSections] = useState<string[]>(['categories', 'price']);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Filtres</h2>
        <button onClick={onReset} className={styles.resetButton}>
          Réinitialiser
        </button>
      </div>

      {/* Catégories */}
      <div className={styles.section}>
        <button
          onClick={() => toggleSection('categories')}
          className={styles.sectionButton}
        >
          <span className={styles.sectionTitle}>Catégories</span>
          <span className={`${styles.chevron} ${openSections.includes('categories') ? styles.open : ''}`}>
            ▼
          </span>
        </button>
        {openSections.includes('categories') && (
          <div className={styles.options}>
            {filters.categories.map((category) => (
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
        <button
          onClick={() => toggleSection('price')}
          className={styles.sectionButton}
        >
          <span className={styles.sectionTitle}>Prix</span>
          <span className={`${styles.chevron} ${openSections.includes('price') ? styles.open : ''}`}>
            ▼
          </span>
        </button>
        {openSections.includes('price') && (
          <div className={styles.options}>
            {filters.priceRanges.map((range) => (
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
        <button
          onClick={() => toggleSection('condition')}
          className={styles.sectionButton}
        >
          <span className={styles.sectionTitle}>État</span>
          <span className={`${styles.chevron} ${openSections.includes('condition') ? styles.open : ''}`}>
            ▼
          </span>
        </button>
        {openSections.includes('condition') && (
          <div className={styles.options}>
            {filters.conditions.map((condition) => (
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
  );
}

