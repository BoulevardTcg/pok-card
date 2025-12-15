import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { CartContext, type Product as ProductType } from './cartContext';
import { useAuth } from './authContext';
import styles from './ProductDetail.module.css';
import { getProduct, getProductReviews, createReview, canReviewProduct } from './api';

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  createdAt: string;
  user: {
    id: string;
    username: string;
    firstName?: string;
    avatar?: string;
  };
}

interface ReviewsData {
  reviews: Review[];
  pagination: {
    page: number;
    total: number;
    pages: number;
  };
  stats: {
    averageRating: number;
    totalReviews: number;
  };
}

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les avis
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, title: '', comment: '' });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [canReview, setCanReview] = useState<{ canReview: boolean; reason: string | null; message: string | null } | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadProduct();
  }, [slug]);
  
  // Charger les avis et vérifier l'éligibilité quand le produit est chargé
  useEffect(() => {
    if (product?.id) {
      loadReviews();
      checkCanReview();
    }
  }, [product?.id, isAuthenticated]);

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
      
      if (!response || !response.product) {
        throw new Error('Format de réponse invalide');
      }
      
      setProduct(response.product);
      if (response.product.variants && response.product.variants.length > 0) {
        setSelectedVariantId(response.product.variants[0].id);
      }
      if (response.product.images && response.product.images.length > 0) {
        setSelectedImage(0);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement du produit:', error);
      setProduct(null);
      setError(error.message || 'Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  }
  
  async function loadReviews() {
    if (!product?.id) return;
    
    setReviewsLoading(true);
    try {
      const data = await getProductReviews(product.id) as ReviewsData;
      setReviewsData(data);
    } catch (err) {
      console.error('Erreur chargement avis:', err);
    } finally {
      setReviewsLoading(false);
    }
  }
  
  async function checkCanReview() {
    if (!product?.id) return;
    
    if (!isAuthenticated) {
      setCanReview({ canReview: false, reason: 'NOT_LOGGED_IN', message: 'Connectez-vous pour laisser un avis' });
      return;
    }
    
    const result = await canReviewProduct(product.id);
    setCanReview(result);
  }
  
  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!product?.id || !isAuthenticated) return;
    
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      await createReview(product.id, newReview.rating, newReview.title || undefined, newReview.comment || undefined);
      setSubmitSuccess(true);
      setShowReviewForm(false);
      setNewReview({ rating: 5, title: '', comment: '' });
      // Recharger les avis (le nouveau sera en attente de modération)
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de l\'envoi de l\'avis');
    }
  }

  const selectedVariant = product?.variants.find(v => v.id === selectedVariantId);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    if (selectedVariant.stock <= 0) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(selectedVariant, product);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            Chargement du produit...
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>
            <div className={styles.errorTitle}>
              {error || 'Produit introuvable'}
            </div>
            <button 
              onClick={() => navigate('/produits')}
              className={styles.backButton}
            >
              Retour aux produits
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Retour
        </button>

        <div className={styles.content}>
          {/* Galerie d'images */}
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              {product.images && product.images.length > 0 ? (
                <img 
                  src={product.images[selectedImage].url} 
                  alt={product.images[selectedImage].altText || product.name}
                  className={styles.image}
                />
              ) : (
                <div className={styles.placeholderImage}>Pas d'image</div>
              )}
              {selectedVariant && selectedVariant.stock <= 0 && (
                <div className={styles.outOfStockBanner}>Rupture de stock</div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className={styles.thumbnailGrid}>
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`${styles.thumbnail} ${selectedImage === index ? styles.active : ''}`}
                  >
                    <img src={image.url} alt={image.altText || `Vue ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations produit */}
          <div className={styles.info}>
            <div className={styles.badges}>
              {product.category && (
                <span className={styles.badge}>{product.category}</span>
              )}
            </div>

            <h1 className={styles.title}>{product.name}</h1>

            {/* Rating */}
            <div className={styles.rating}>
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`${styles.star} ${i < Math.round(reviewsData?.stats.averageRating || 0) ? styles.filled : ''}`}>
                  ⭐
                </span>
              ))}
              <span className={styles.reviews}>
                {reviewsData?.stats.totalReviews 
                  ? `(${reviewsData.stats.totalReviews} avis - ${reviewsData.stats.averageRating.toFixed(1)}/5)`
                  : '(Aucun avis)'}
              </span>
            </div>

            {/* Prix */}
            <div className={styles.priceSection}>
              {selectedVariant && (
                <>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>
                      {formatPrice(selectedVariant.priceCents)}€
                    </span>
                  </div>
                  <div className={styles.stockInfo}>
                    <span className={styles.stockLabel}>État :</span>
                    <span className={styles.stockValue}>Neuf</span>
                  </div>
                  {selectedVariant.stock > 0 ? (
                    <p className={styles.stockAvailable}>
                      {selectedVariant.stock} en stock
                    </p>
                  ) : (
                    <p className={styles.stockUnavailable}>
                      Rupture de stock
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className={styles.descriptionSection}>
                <h2 className={styles.sectionTitle}>Description</h2>
                <p className={styles.description}>{product.description}</p>
              </div>
            )}

            {/* Variantes */}
            {product.variants.length > 1 && (
              <div className={styles.variantsSection}>
                <label className={styles.variantsLabel}>Variante :</label>
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

            {/* Quantité et actions */}
            <div className={styles.actionsSection}>
              <div className={styles.quantitySection}>
                <label className={styles.quantityLabel}>Quantité :</label>
                <div className={styles.quantityControls}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className={styles.quantityButton}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className={styles.quantityValue}>{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(selectedVariant?.stock || 1, quantity + 1))}
                    className={styles.quantityButton}
                    disabled={!selectedVariant || selectedVariant.stock <= quantity}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.actionButtons}>
                <button
                  className={styles.addToCartButton}
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || selectedVariant.stock <= 0}
                >
                  🛒 Ajouter au panier
                </button>
              </div>
            </div>

            {/* Garanties */}
            <div className={styles.guarantees}>
              <div className={styles.guaranteeItem}>
                <span className={styles.guaranteeIcon}>🛡️</span>
                <div>
                  <p className={styles.guaranteeTitle}>Authenticité</p>
                  <p className={styles.guaranteeText}>Garantie</p>
                </div>
              </div>
              <div className={styles.guaranteeItem}>
                <span className={styles.guaranteeIcon}>🚚</span>
                <div>
                  <p className={styles.guaranteeTitle}>Livraison</p>
                  <p className={styles.guaranteeText}>Gratuite dès 50€</p>
                </div>
              </div>
              <div className={styles.guaranteeItem}>
                <span className={styles.guaranteeIcon}>↩️</span>
                <div>
                  <p className={styles.guaranteeTitle}>Retours</p>
                  <p className={styles.guaranteeText}>Gratuits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Section Avis */}
        <div className={styles.reviewsSection}>
          {/* En-tête avec note globale */}
          <div className={styles.reviewsHeader}>
            <div className={styles.reviewsHeaderLeft}>
              <h2 className={styles.reviewsTitle}>Ce qu'en pensent nos clients</h2>
              {reviewsData?.stats && reviewsData.stats.totalReviews > 0 && (
                <div className={styles.ratingOverview}>
                  <span className={styles.ratingScore}>{reviewsData.stats.averageRating.toFixed(1)}</span>
                  <div className={styles.ratingDetails}>
                    <div className={styles.starsRow}>
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`${styles.starIcon} ${i < Math.round(reviewsData.stats.averageRating) ? styles.starFilled : ''}`} viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className={styles.reviewCount}>{reviewsData.stats.totalReviews} avis vérifiés</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Bouton écrire un avis */}
            {!showReviewForm && (
              <div className={styles.reviewsHeaderRight}>
                {submitSuccess ? (
                  <span className={styles.thankYouMsg}>Merci pour votre avis !</span>
                ) : canReview?.canReview ? (
                  <button className={styles.writeBtn} onClick={() => setShowReviewForm(true)}>
                    Écrire un avis
                  </button>
                ) : canReview?.reason === 'NOT_LOGGED_IN' ? (
                  <a href="/connexion" className={styles.loginLink}>Se connecter pour donner son avis</a>
                ) : canReview?.reason === 'ALREADY_REVIEWED' ? (
                  <span className={styles.alreadyReviewed}>Vous avez déjà noté ce produit</span>
                ) : canReview?.reason === 'NOT_PURCHASED' ? (
                  <span className={styles.purchaseRequired}>Réservé aux acheteurs</span>
                ) : null}
              </div>
            )}
          </div>

          {/* Formulaire d'avis */}
          {showReviewForm && canReview?.canReview && (
            <div className={styles.reviewForm}>
              <form onSubmit={handleSubmitReview}>
                <div className={styles.formHeader}>
                  <h3>Partagez votre expérience</h3>
                  <button type="button" className={styles.closeForm} onClick={() => setShowReviewForm(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className={styles.ratingField}>
                  <span className={styles.fieldLabel}>Note</span>
                  <div className={styles.starPicker}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className={`${styles.pickStar} ${star <= newReview.rating ? styles.picked : ''}`}
                        aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className={styles.textField}>
                  <label className={styles.fieldLabel}>
                    Titre
                    <span className={styles.optionalTag}>Facultatif</span>
                  </label>
                  <input
                    type="text"
                    placeholder="En quelques mots..."
                    value={newReview.title}
                    onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                    maxLength={100}
                  />
                </div>
                
                <div className={styles.textField}>
                  <label className={styles.fieldLabel}>
                    Votre avis
                    <span className={styles.optionalTag}>Facultatif</span>
                  </label>
                  <textarea
                    placeholder="Qu'avez-vous pensé de ce produit ?"
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    maxLength={1000}
                    rows={3}
                  />
                </div>
                
                {submitError && <p className={styles.errorMsg}>{submitError}</p>}
                
                <button type="submit" className={styles.publishBtn}>
                  Publier
                </button>
              </form>
            </div>
          )}
          
          {/* Liste des avis */}
          {reviewsLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
            </div>
          ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
            <div className={styles.reviewsList}>
              {reviewsData.reviews.map((review) => (
                <article key={review.id} className={styles.review}>
                  <header className={styles.reviewTop}>
                    <div className={styles.reviewerBlock}>
                      <div className={styles.avatar}>
                        {review.user.avatar ? (
                          <img src={review.user.avatar} alt="" />
                        ) : (
                          (review.user.firstName || review.user.username).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className={styles.reviewerName}>
                          {review.user.firstName || review.user.username}
                        </span>
                        {review.isVerified && (
                          <span className={styles.verified}>Achat vérifié</span>
                        )}
                      </div>
                    </div>
                    <time className={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </time>
                  </header>
                  
                  <div className={styles.reviewStars}>
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`${styles.star} ${i < review.rating ? styles.filled : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  
                  {review.title && <h4 className={styles.reviewTitle}>{review.title}</h4>}
                  {review.comment && <p className={styles.reviewText}>{review.comment}</p>}
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.noReviews}>
              <p>Aucun avis pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
