import { useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { CartContext } from '../../cartContext';
import { useAuth } from '../../authContext';
import { getImageUrl } from '../../api';
import type { Product } from '../../cartContext';
import { getProductType, productTypeLabels } from '../../utils/filters';
import styles from './ProductListItem.module.css';

interface ProductListItemProps {
  product: Product;
  index?: number;
}

// Fonction pour vérifier si un produit est nouveau (moins de 30 jours)
function isNewProduct(product: Product): boolean {
  if (!product.createdAt) return false;
  const createdDate = new Date(product.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return createdDate > thirtyDaysAgo;
}

// Fonction pour vérifier si un produit est phare
function isFeaturedProduct(product: Product): boolean {
  return (product.minPriceCents && product.minPriceCents > 5000) || isNewProduct(product);
}

// Fonction pour obtenir le statut du stock
function getStockStatus(product: Product): {
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'coming-soon';
  label: string;
  totalStock: number;
} {
  if (!product.variants || product.variants.length === 0) {
    return { status: 'coming-soon', label: 'Bientôt disponible', totalStock: 0 };
  }

  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);

  if (product.outOfStock || totalStock === 0) {
    return { status: 'out-of-stock', label: 'Épuisé', totalStock: 0 };
  }

  if (totalStock < 10) {
    return { status: 'low-stock', label: `Stock limité (${totalStock})`, totalStock };
  }

  return {
    status: 'in-stock',
    label: totalStock >= 150 ? 'En stock (150+)' : `En stock (${totalStock})`,
    totalStock,
  };
}

// Fonction pour obtenir la langue du produit
function getProductLanguage(product: Product): string {
  if (!product.variants || product.variants.length === 0) return 'N/A';
  const firstVariant = product.variants.find((v) => v.language) || product.variants[0];
  return firstVariant.language || 'N/A';
}

export default function ProductListItem({ product, index = 0 }: ProductListItemProps) {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { isAuthenticated } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const formatPrice = (cents: number | null) => {
    if (cents === null) return 'Prix sur demande';
    const euros = (cents / 100).toFixed(2);
    return euros.replace('.', ',');
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAddingToCart) return;

    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: product.slug ? `/produit/${product.slug}` : '/produits' },
      });
      return;
    }

    const stockStatus = getStockStatus(product);

    if (stockStatus.status === 'out-of-stock' || stockStatus.status === 'coming-soon') {
      if (product.slug) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        navigate(`/produit/${product.slug}`);
      }
      return;
    }

    if (product.variants && product.variants.length > 0) {
      setIsAddingToCart(true);
      const availableVariant = product.variants.find((v) => v.stock > 0);

      if (availableVariant) {
        addToCart(availableVariant, product);
        setTimeout(() => {
          setIsAddingToCart(false);
        }, 300);
      } else {
        setIsAddingToCart(false);
        if (product.slug) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          navigate(`/produit/${product.slug}`);
        }
      }
    }
  };

  const handleCardClick = () => {
    if (product.slug) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(`/produit/${product.slug}`);
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: product.slug ? `/produit/${product.slug}` : '/produits' },
      });
      return;
    }

    setIsWishlisted(!isWishlisted);
  };

  const stockStatus = getStockStatus(product);
  const productType = getProductType(product);
  const language = getProductLanguage(product);
  const isNew = isNewProduct(product);
  const isFeatured = isFeaturedProduct(product);
  const badge = isNew ? 'Nouveauté' : isFeatured ? 'Produit phare' : null;

  const productImage =
    product.images && product.images.length > 0
      ? product.images[0].url
      : product.image?.url || null;

  return (
    <article
      className={`${styles.listItem} ${stockStatus.status === 'out-of-stock' ? styles.outOfStock : ''}`}
      onClick={handleCardClick}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Image */}
      <div className={styles.imageWrapper}>
        {productImage ? (
          <img
            src={getImageUrl(productImage)}
            alt={product.image?.altText || product.name}
            className={styles.productImage}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholderImage}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="4"
                y="8"
                width="56"
                height="48"
                rx="4"
                fill="#d1d5db"
                stroke="#9ca3af"
                strokeWidth="2"
              />
              <circle cx="20" cy="24" r="3" fill="#9ca3af" />
              <circle cx="32" cy="24" r="3" fill="#9ca3af" />
              <circle cx="44" cy="24" r="3" fill="#9ca3af" />
            </svg>
          </div>
        )}
        {badge && (
          <span className={`${styles.badge} ${isNew ? styles.badgeNew : styles.badgeFeatured}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Infos produit */}
      <div className={styles.productInfo}>
        <div className={styles.topRow}>
          <span className={styles.categoryBadge}>{product.category}</span>
        </div>
        <h3 className={styles.productName}>{product.name}</h3>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>{productTypeLabels[productType]}</span>
          <span className={styles.metaItem}>{language}</span>
        </div>
        {product.description && <p className={styles.description}>{product.description}</p>}
      </div>

      {/* Prix */}
      <div className={styles.priceSection}>
        <span className={styles.price}>{formatPrice(product.minPriceCents)} €</span>
        <span className={`${styles.stockStatus} ${styles[stockStatus.status]}`}>
          {stockStatus.label}
        </span>
      </div>

      {/* Actions */}
      <div className={styles.actionsSection}>
        {stockStatus.status === 'coming-soon' ? (
          <button className={styles.notifyButton} onClick={handleCardClick}>
            Me notifier
          </button>
        ) : (
          <button
            className={`${styles.addToCartButton} ${isAddingToCart ? styles.adding : ''}`}
            onClick={handleAddToCart}
            disabled={stockStatus.status === 'out-of-stock' || isAddingToCart}
          >
            {isAddingToCart ? 'Ajout...' : 'Ajouter au panier'}
          </button>
        )}
        <button
          className={`${styles.wishlistButton} ${isWishlisted ? styles.wishlisted : ''}`}
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isWishlisted ? '❤️' : '🤍'}
        </button>
      </div>
    </article>
  );
}
