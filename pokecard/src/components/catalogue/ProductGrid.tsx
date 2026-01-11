import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductListItem from './ProductListItem';
import ViewToggle from './ViewToggle';
import type { Product } from '../../cartContext';
import type { ViewMode } from '../../hooks/useViewPreference';
import styles from './ProductGrid.module.css';

// Nombre max de badges "NOUVEAU" à afficher
const MAX_NEW_BADGES = 5;

// Vérifie si un produit a une image
function hasProductImage(product: Product): boolean {
  return !!(
    (product.images && product.images.length > 0 && product.images[0].url) ||
    product.image?.url
  );
}

// Vérifie si un produit est récent (moins de 30 jours)
function isRecentProduct(product: Product): boolean {
  if (!product.createdAt) return false;
  const createdDate = new Date(product.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return createdDate > thirtyDaysAgo;
}

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

  // Calculer les IDs des produits éligibles au badge "NOUVEAU"
  const newBadgeProductIds = useMemo(() => {
    // Filtrer : récent (30 jours) ET a une image
    const eligibleProducts = products
      .filter((p) => isRecentProduct(p) && hasProductImage(p))
      .sort((a, b) => {
        // Trier par date de création décroissante (plus récent en premier)
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, MAX_NEW_BADGES);

    return new Set(eligibleProducts.map((p) => p.id));
  }, [products]);

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
              <ProductCard product={product} showNewBadge={newBadgeProductIds.has(product.id)} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.list} key="list-view">
          {products.map((product, index) => (
            <ProductListItem
              key={product.id}
              product={product}
              index={index}
              showNewBadge={newBadgeProductIds.has(product.id)}
            />
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
