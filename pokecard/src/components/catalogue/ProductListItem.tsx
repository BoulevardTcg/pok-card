import { useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { CartContext } from '../../cartContext';
import { useAuth } from '../../authContext';
import { getImageUrl } from '../../api';
import { NotifyModal } from '../NotifyModal';
import type { Product } from '../../cartContext';
import { getProductType, productTypeLabels } from '../../utils/filters';
import styles from './ProductListItem.module.css';

interface ProductListItemProps {
  product: Product;
  index?: number;
  showNewBadge?: boolean;
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
    return { status: 'out-of-stock', label: 'Bientôt disponible', totalStock: 0 };
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

export default function ProductListItem({
  product,
  index = 0,
  showNewBadge = false,
}: ProductListItemProps) {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { isAuthenticated } = useAuth();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);

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

  const stockStatus = getStockStatus(product);
  const productType = getProductType(product);
  const language = getProductLanguage(product);

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
              className={styles.placeholderLogo}
              width="60"
              height="60"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="phoenixGradientList" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#d4af37" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <path
                d="M100 40 L85 80 L70 100 L85 110 L100 120 L115 110 L130 100 L115 80 Z"
                fill="url(#phoenixGradientList)"
                opacity="0.6"
              />
              <path
                d="M70 100 L40 90 L30 95 L25 100 L30 105 L40 110 L55 108 L70 105 Z"
                fill="url(#phoenixGradientList)"
                opacity="0.5"
              />
              <path
                d="M130 100 L160 90 L170 95 L175 100 L170 105 L160 110 L145 108 L130 105 Z"
                fill="url(#phoenixGradientList)"
                opacity="0.5"
              />
              <path
                d="M100 120 L95 140 L90 155 L100 160 L110 155 L105 140 Z"
                fill="url(#phoenixGradientList)"
                opacity="0.4"
              />
              <ellipse
                cx="100"
                cy="50"
                rx="15"
                ry="18"
                fill="url(#phoenixGradientList)"
                opacity="0.5"
              />
            </svg>
          </div>
        )}
        {showNewBadge && <span className={`${styles.badge} ${styles.badgeNew}`}>Nouveau</span>}
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
        {stockStatus.status === 'coming-soon' || stockStatus.status === 'out-of-stock' ? (
          <button
            className={styles.notifyButton}
            onClick={(e) => {
              e.stopPropagation();
              setNotifyModalOpen(true);
            }}
          >
            Me prévenir
          </button>
        ) : (
          <button
            className={`${styles.addToCartButton} ${isAddingToCart ? styles.adding : ''}`}
            onClick={handleAddToCart}
            disabled={isAddingToCart}
          >
            {isAddingToCart ? 'Ajout...' : 'Ajouter au panier'}
          </button>
        )}
        <div className={styles.trustInfo}>
          <span>Authenticité garantie</span>
          <span className={styles.separator}>•</span>
          <span>Paiement sécurisé</span>
        </div>
      </div>

      {/* Notify Modal */}
      <NotifyModal
        isOpen={notifyModalOpen}
        onClose={() => setNotifyModalOpen(false)}
        productId={product.id}
        productName={product.name}
      />
    </article>
  );
}
