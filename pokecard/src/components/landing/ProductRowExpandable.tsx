import type { Product } from '../../cartContext';
import styles from './ProductRowExpandable.module.css';

type Props = {
  product: Product;
  imageUrl: string;
  onClick: () => void;
  onAddToCart?: (e: React.MouseEvent) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  rarityBadge?: string | null;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  id?: string;
};

export function ProductRowExpandable({
  product,
  imageUrl,
  onClick,
  onAddToCart,
  isExpanded,
  onToggleExpand,
  rarityBadge,
  isBestSeller,
  isFeatured,
  id,
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
    if ((e.target as HTMLElement).closest(`.${styles.expandButton}`)) {
      onToggleExpand();
      return;
    }
    onClick();
  };

  return (
    <div id={id} className={`${styles.row} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.rowContent} onClick={handleRowClick}>
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
        <button
          className={styles.expandButton}
          onClick={onToggleExpand}
          aria-label={isExpanded ? 'Réduire' : 'Développer'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '⌄' : '›'}
        </button>
      </div>
      {isExpanded && (
        <div className={styles.expandedContent}>
          <div className={styles.expandedImage}>
            <img
              src={imageUrl}
              alt={product.name}
              className={styles.image}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('placeholder.png')) {
                  target.src = '/img/products/placeholder.png';
                }
              }}
            />
          </div>
          <div className={styles.expandedActions}>
            {onAddToCart && hasStock && (
              <button
                className={styles.addToCartButton}
                onClick={onAddToCart}
                aria-label={`Ajouter ${product.name} au panier`}
              >
                Ajouter au panier
              </button>
            )}
            <button className={styles.viewButton} onClick={onClick}>
              Voir le produit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
