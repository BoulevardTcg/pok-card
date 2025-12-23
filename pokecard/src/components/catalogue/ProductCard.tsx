import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../../cartContext';
import { useAuth } from '../../authContext';
import type { Product } from '../../cartContext';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { isAuthenticated } = useAuth();

  const formatPrice = (cents: number | null) => {
    if (cents === null) return 'Prix sur demande';
    return (cents / 100).toFixed(2).replace('.', ',') + '€';
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Vérifier l'authentification
    if (!isAuthenticated) {
      navigate('/login', { state: { from: product.slug ? `/produit/${product.slug}` : '/produits' } });
      return;
    }
    
    if (!product.outOfStock && product.variants && product.variants.length > 0) {
      // Sélectionner la première variante disponible (avec stock > 0)
      const availableVariant = product.variants.find(v => v.stock > 0);
      
      if (availableVariant) {
        addToCart(availableVariant, product);
      } else {
        // Si aucune variante n'a de stock, rediriger vers la page de détail
        if (product.slug) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          navigate(`/produit/${product.slug}`);
        }
      }
    }
  };

  const handleCardClick = () => {
    if (product.slug && !product.outOfStock) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(`/produit/${product.slug}`);
    }
  };

  return (
    <div className={styles.card} onClick={handleCardClick}>
      <div className={styles.imageContainer}>
        {product.image ? (
          <img
            src={product.image.url}
            alt={product.image.altText || product.name}
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholderImage}>Pas d'image</div>
        )}
        <div className={styles.imageOverlay}></div>
        
        {/* Badge catégorie */}
        {product.category && (
          <div className={styles.badge}>
            <span className={styles.badgeText}>{product.category}</span>
          </div>
        )}

        {/* Actions au survol */}
        <div className={styles.hoverActions}>
          <button 
            onClick={handleAddToCart}
            disabled={product.outOfStock}
            className={styles.addButton}
            aria-label={`Ajouter ${product.name} au panier`}
          >
            🛒 Ajouter
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Note étoiles (placeholder) */}
        <div className={styles.rating}>
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`${styles.star} ${i < 4 ? styles.filled : ''}`}>
              ★
            </span>
          ))}
        </div>

        <h3 className={styles.name}>{product.name}</h3>
        
        {product.description && (
          <p className={styles.description}>
            {product.description.length > 60 
              ? product.description.substring(0, 60) + '...' 
              : product.description}
          </p>
        )}

        <div className={styles.priceContainer}>
          {product.minPriceCents !== null ? (
            <span className={styles.price}>
              {formatPrice(product.minPriceCents)}
            </span>
          ) : (
            <span className={styles.price}>Prix sur demande</span>
          )}
        </div>

        {product.outOfStock && (
          <div className={styles.outOfStock}>Rupture de stock</div>
        )}
      </div>
    </div>
  );
}

