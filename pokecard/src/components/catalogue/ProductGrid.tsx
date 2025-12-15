import { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import type { Product } from '../../cartContext';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

export default function ProductGrid({ products, onPageChange, currentPage, totalPages }: ProductGridProps) {
  const [sortBy, setSortBy] = useState('featured');

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => (a.minPriceCents || 0) - (b.minPriceCents || 0));
      case 'price-desc':
        return sorted.sort((a, b) => (b.minPriceCents || 0) - (a.minPriceCents || 0));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      case 'rating':
        // Placeholder - pas de rating pour l'instant
        return sorted;
      default:
        return sorted;
    }
  }, [products, sortBy]);

  return (
    <div className={styles.gridContainer}>
      {/* Barre de tri */}
      <div className={styles.toolbar}>
        <p className={styles.count}>
          {products.length} produit{products.length > 1 ? 's' : ''} trouvé{products.length > 1 ? 's' : ''}
        </p>
        <div className={styles.sortContainer}>
          <label className={styles.sortLabel}>Trier par :</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="featured">En vedette</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="newest">Plus récent</option>
            <option value="rating">Meilleure note</option>
          </select>
        </div>
      </div>

      {/* Grille de produits */}
      <div className={styles.grid}>
        {sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            Précédent
          </button>
          {[...Array(totalPages)].map((_, i) => {
            const page = i + 1;
            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
                >
                  {page}
                </button>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return <span key={page} className={styles.ellipsis}>...</span>;
            }
            return null;
          })}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.pageButton}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

