import type { Product } from '../../cartContext';
import styles from './ProductRowDense.module.css';

type Props = {
  product: Product;
  onClick: () => void;
  onAddToCart?: (e: React.MouseEvent) => void;
  rarityBadge?: string | null;
  isBestSeller?: boolean;
  isFeatured?: boolean;
};

export function ProductRowDense({
  product,
  onClick,
  onAddToCart,
  rarityBadge,
  isBestSeller,
  isFeatured,
}: Props) {
  const formatPrice = (cents: number | null): string => {
    if (cents === null) return 'Sur demande';
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  const hasStock = totalStock > 0 && !product.outOfStock;

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick();
  };

  return (
    <div className={styles.row} onClick={handleRowClick}>
      <div className={styles.content}>
        <div className={styles.nameSection}>
          <h3 className={styles.name} title={product.name}>
            {product.name}
          </h3>
          {(isBestSeller || isFeatured || rarityBadge) && (
            <span
              className={`${styles.badge} ${
                isBestSeller
                  ? styles.badgeBestseller
                  : isFeatured
                    ? styles.badgeFeatured
                    : rarityBadge === 'Nouveauté'
                      ? styles.badgeNew
                      : rarityBadge === 'Hot'
                        ? styles.badgeHot
                        : rarityBadge === 'Rare'
                          ? styles.badgeRare
                          : styles.badgeDefault
              }`}
            >
              {isBestSeller
                ? 'Best'
                : isFeatured
                  ? 'Phare'
                  : rarityBadge === 'Nouveauté'
                    ? 'New'
                    : rarityBadge === 'Hot'
                      ? 'Hot'
                      : rarityBadge === 'Rare'
                        ? 'Rare'
                        : rarityBadge || ''}
            </span>
          )}
        </div>
        <div className={styles.meta}>
          <span className={styles.price}>{formatPrice(product.minPriceCents)}</span>
          <div className={styles.stockIndicator}>
            {hasStock ? (
              <span className={styles.stockDot} />
            ) : (
              <span className={styles.stockLabel}>Rupture</span>
            )}
          </div>
        </div>
      </div>
      {onAddToCart && hasStock && (
        <button
          className={styles.addButton}
          onClick={onAddToCart}
          aria-label={`Ajouter ${product.name} au panier`}
        >
          +
        </button>
      )}
      <div className={styles.chevron}>›</div>
    </div>
  );
}
