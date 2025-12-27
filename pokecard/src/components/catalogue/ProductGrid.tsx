import { useSearchParams } from 'react-router-dom';
import ProductCard from './ProductCard';
import type { Product } from '../../cartContext';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

export default function ProductGrid({
  products,
  onPageChange,
  currentPage,
  totalPages,
}: ProductGridProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sortBy = searchParams.get('sort') || 'newest';

  return (
    <div className={styles.gridContainer}>
      {/* Barre de tri */}
      <div className={styles.toolbar}>
        <p className={styles.count}>
          {products.length} produit{products.length > 1 ? 's' : ''} trouvé
          {products.length > 1 ? 's' : ''}
        </p>
        <div className={styles.sortContainer}>
          <label className={styles.sortLabel}>Trier par :</label>
          <select
            value={sortBy}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('sort', e.target.value);
              setSearchParams(newParams);
            }}
            className={styles.sortSelect}
          >
            <option value="newest">Plus récent</option>
            <option value="price-asc">Prix : croissant</option>
            <option value="price-desc">Prix : décroissant</option>
          </select>
        </div>
      </div>

      {/* Grille de produits */}
      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Aucun produit trouvé.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

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
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
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
              return (
                <span key={page} className={styles.ellipsis}>
                  ...
                </span>
              );
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
