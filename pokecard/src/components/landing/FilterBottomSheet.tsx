import { useEffect } from 'react';
import styles from './FilterBottomSheet.module.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
};

export function FilterBottomSheet({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
}: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filtres et tri">
        <div className={styles.header}>
          <h3 className={styles.title}>Filtres et tri</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.section}>
            <label className={styles.label}>Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className={styles.select}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.section}>
            <label className={styles.label}>Trier par</label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className={styles.select}
            >
              <option value="popular">Populaires</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="newest">Nouveautés</option>
            </select>
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.applyButton} onClick={onClose}>
            Appliquer
          </button>
        </div>
      </div>
    </>
  );
}
