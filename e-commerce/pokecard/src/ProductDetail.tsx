import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { CartContext, type Product as ProductType } from './cartContext';
import styles from './ProductDetail.module.css';
import { getProduct } from './api';

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const [product, setProduct] = useState<ProductType | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadProduct();
  }, [slug]);

  async function loadProduct() {
    if (!slug) {
      setLoading(false);
      setError('Slug manquant');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await getProduct(slug) as { product: ProductType };
      console.log('Produit chargé:', response);
      
      if (!response || !response.product) {
        throw new Error('Format de réponse invalide');
      }
      
      setProduct(response.product);
      if (response.product.variants && response.product.variants.length > 0) {
        setSelectedVariantId(response.product.variants[0].id);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement du produit:', error);
      console.error('Slug utilisé:', slug);
      console.error('Détails:', error.message, error.stack);
      setProduct(null);
      setError(error.message || 'Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  }

  const selectedVariant = product?.variants.find(v => v.id === selectedVariantId);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    if (selectedVariant.stock <= 0) return;
    addToCart(selectedVariant, product);
  };

  if (loading) {
    return (
      <div className={styles.detailWrapper}>
        <div style={{ 
          padding: '4rem 2rem', 
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontSize: '1.25rem', color: 'var(--accent)', fontWeight: 600 }}>
            Chargement du produit...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.detailWrapper}>
        <div style={{ 
          padding: '4rem 2rem', 
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontSize: '1.25rem', color: '#ef4444', marginBottom: '1.5rem', fontWeight: 600 }}>
            Erreur : {error}
          </div>
          <button 
            onClick={() => navigate('/produits')}
            className={styles.addBtn}
            style={{ margin: '0 auto', display: 'block', maxWidth: '300px' }}
          >
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.detailWrapper}>
        <div style={{ 
          padding: '4rem 2rem', 
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontSize: '1.25rem', color: 'var(--gray-light)', marginBottom: '1.5rem', fontWeight: 600 }}>
            Produit introuvable.
          </div>
          <button 
            onClick={() => navigate('/produits')}
            className={styles.addBtn}
            style={{ margin: '0 auto', display: 'block', maxWidth: '300px' }}
          >
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detailWrapper}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>&larr; Retour</button>
      <div className={styles.detailCard}>
        <div className={styles.imageSection}>
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0].url} alt={product.images[0].altText || product.name} />
          ) : (
            <div className={styles.placeholderImage}>Pas d'image</div>
          )}
          {selectedVariant && selectedVariant.stock <= 0 && (
            <div className={styles.outOfStockBanner}>Rupture de stock</div>
          )}
        </div>
        <div className={styles.info}>
          <h1>{product.name}</h1>
          <div className={styles.category}>{product.category}</div>
          {product.description && (
            <div className={styles.desc}>{product.description}</div>
          )}

          {product.variants.length > 0 && (
            <div className={styles.variants}>
              <label>Variante :</label>
              <select
                value={selectedVariantId || ''}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className={styles.variantSelect}
              >
                {product.variants.map(variant => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                    {variant.language && ` - ${variant.language}`}
                    {variant.edition && ` (${variant.edition})`}
                    {variant.stock <= 0 ? ' - Rupture' : ` - ${formatPrice(variant.priceCents)}€`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedVariant && (
            <>
              <div className={styles.price}>
                {formatPrice(selectedVariant.priceCents)}€
              </div>
              <div className={styles.stock} style={{
                color: selectedVariant.stock > 0 ? 'var(--gray-light)' : '#ef4444',
                background: selectedVariant.stock > 0 ? 'rgba(100, 116, 139, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderColor: selectedVariant.stock > 0 ? 'rgba(100, 116, 139, 0.2)' : 'rgba(239, 68, 68, 0.3)'
              }}>
                Stock : {selectedVariant.stock > 0 ? `${selectedVariant.stock} disponible${selectedVariant.stock > 1 ? 's' : ''}` : 'Rupture de stock'}
              </div>
            </>
          )}

          <button
            className={styles.addBtn}
            onClick={handleAddToCart}
            disabled={!selectedVariant || selectedVariant.stock <= 0}
          >
            {!selectedVariant || selectedVariant.stock <= 0
              ? 'Rupture de stock'
              : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </div>
  );
}
