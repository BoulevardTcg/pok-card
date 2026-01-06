import type { Product } from '../../cartContext';
import styles from './ProductCardCompact.module.css';

type Props = {
  product: Product;
  imageUrl: string;
  onClick: () => void;
  rarityBadge?: string | null;
  isBestSeller?: boolean;
  isFeatured?: boolean;
};

export function ProductCardCompact({
  product,
  imageUrl,
  onClick,
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

  return (
    <article className={styles.card} onClick={onClick}>
      <div className={styles.imageWrapper}>
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
        {(isBestSeller || isFeatured || rarityBadge) && (
          <div
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
          </div>
        )}
        {!hasStock && <div className={styles.stockDot} />}
      </div>
      <div className={styles.content}>
        <h3 className={styles.name} title={product.name}>
          {product.name}
        </h3>
        <div className={styles.footer}>
          <span className={styles.price}>{formatPrice(product.minPriceCents)}</span>
          {!hasStock && <span className={styles.stockLabel}>Rupture</span>}
        </div>
      </div>
    </article>
  );
}
