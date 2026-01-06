import { useState, useCallback, useEffect, useMemo } from 'react';
import { ProductCardCompact } from './ProductCardCompact';
import { ProductRowDense } from './ProductRowDense';
import { ProductRowExpandable } from './ProductRowExpandable';
import type { Product } from '../../cartContext';
import type { CatalogViewMode } from './CatalogViewToggle';
import styles from './ShopSectionMobile.module.css';

type Props = {
  products: Product[];
  viewMode: CatalogViewMode;
  onProductClick: (product: Product) => void;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
  getRarityBadge: (product: Product) => string | null;
  isBestSeller: (product: Product) => boolean;
  isFeatured: (product: Product) => boolean;
};

function getImageUrl(product: Product): string {
  const rawImageUrl = product.image?.url || product.images?.[0]?.url;
  if (!rawImageUrl) return '/img/products/placeholder.png';
  if (
    rawImageUrl.startsWith('http') ||
    rawImageUrl.startsWith('/') ||
    rawImageUrl.startsWith('data:')
  ) {
    return rawImageUrl;
  }
  if (rawImageUrl.includes('.') && !rawImageUrl.includes(' ')) {
    return `/img/products/${rawImageUrl}`;
  }
  return '/img/products/placeholder.png';
}

export function ShopSectionMobile({
  products,
  viewMode,
  onProductClick,
  onAddToCart,
  getRarityBadge,
  isBestSeller,
  isFeatured,
}: Props) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (expandedItemId && viewMode === 'expand') {
      const timeoutId = setTimeout(() => {
        const element = document.getElementById(`product-row-${expandedItemId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [expandedItemId, viewMode]);

  const handleToggleExpand = useCallback((productId: string) => {
    setExpandedItemId((prev) => (prev === productId ? null : productId));
  }, []);

  const itemsPerRow = useMemo(() => {
    if (typeof window === 'undefined') return 2;
    return window.innerWidth >= 390 ? 3 : 2;
  }, []);

  if (viewMode === 'grid') {
    const rowCount = Math.ceil(products.length / itemsPerRow);

    return (
      <div className={styles.gridContainer}>
        {Array.from({ length: rowCount }).map((_, rowIndex) => {
          const startIndex = rowIndex * itemsPerRow;
          const rowProducts = products.slice(startIndex, startIndex + itemsPerRow);
          return (
            <div key={rowIndex} className={styles.gridRow}>
              {rowProducts.map((product) => {
                const rarityBadge = getRarityBadge(product);
                return (
                  <ProductCardCompact
                    key={product.id}
                    product={product}
                    imageUrl={getImageUrl(product)}
                    onClick={() => onProductClick(product)}
                    rarityBadge={rarityBadge}
                    isBestSeller={isBestSeller(product)}
                    isFeatured={isFeatured(product)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  if (viewMode === 'dense') {
    return (
      <div className={styles.listContainer}>
        {products.length === 0 ? (
          <div className={styles.emptyState}>Aucun produit trouvé</div>
        ) : (
          products.map((product) => {
            if (!product || !product.id) return null;
            const rarityBadge = getRarityBadge(product);
            return (
              <ProductRowDense
                key={product.id}
                product={product}
                onClick={() => onProductClick(product)}
                onAddToCart={(e) => onAddToCart(e, product)}
                rarityBadge={rarityBadge}
                isBestSeller={isBestSeller(product)}
                isFeatured={isFeatured(product)}
              />
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      {products.length === 0 ? (
        <div className={styles.emptyState}>Aucun produit trouvé</div>
      ) : (
        products.map((product) => {
          if (!product || !product.id) return null;
          const rarityBadge = getRarityBadge(product);
          return (
            <ProductRowExpandable
              key={product.id}
              id={`product-row-${product.id}`}
              product={product}
              imageUrl={getImageUrl(product)}
              onClick={() => onProductClick(product)}
              onAddToCart={(e) => onAddToCart(e, product)}
              isExpanded={product.id === expandedItemId}
              onToggleExpand={() => handleToggleExpand(product.id)}
              rarityBadge={rarityBadge}
              isBestSeller={isBestSeller(product)}
              isFeatured={isFeatured(product)}
            />
          );
        })
      )}
    </div>
  );
}
