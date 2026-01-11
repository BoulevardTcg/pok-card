import { useSearchParams } from 'react-router-dom';
import ProductCard from './ProductCard';
import ProductListItem from './ProductListItem';
import ViewToggle from './ViewToggle';
import type { Product } from '../../cartContext';
import type { ViewMode } from '../../hooks/useViewPreference';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
  viewMode: ViewMode;
  onViewModeChange: (view: ViewMode) => void;
}

export default function ProductGrid({
  products,
  onPageChange,
  currentPage,
  totalPages,
  viewMode,
  onViewModeChange,
}: ProductGridProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sortBy = searchParams.get('sort') || 'newest';

  return (
    <div className={styles.gridContainer}>
      {/* Barre de tri et toggle vue */}
      <div className={styles.toolbar}>
        <p className={styles.count}>
          {products.length} produit{products.length > 1 ? 's' : ''} trouvé
          {products.length > 1 ? 's' : ''}
        </p>
        <div className={styles.toolbarRight}>
          <ViewToggle view={viewMode} onChange={onViewModeChange} />
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
      </div>

      {/* Grille ou Liste de produits */}
      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Aucun produit trouvé.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className={styles.grid} key="grid-view">
          {products.map((product, index) => (
            <div
              key={product.id}
              className={styles.gridItem}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.list} key="list-view">
          {products.map((product, index) => (
            <ProductListItem key={product.id} product={product} index={index} />
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
