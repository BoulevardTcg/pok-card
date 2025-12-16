import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { CartContext, type Product as ProductType } from './cartContext';
import { useAuth } from './authContext';
import styles from './ProductDetail.module.css';
import { getProduct, getProductReviews, createReview, canReviewProduct, listProducts } from './api';
import { ArrowRightIcon } from './components/icons/Icons';

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
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
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
  
  // États pour produits similaires
  const [similarProducts, setSimilarProducts] = useState<ProductType[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadProduct();
  }, [slug]);
  
  useEffect(() => {
    if (product?.id) {
      loadReviews();
      checkCanReview();
    }
  }, [product?.id, isAuthenticated]);
  
  useEffect(() => {
    if (product?.category) {
      loadSimilarProducts();
    }
  }, [product?.category, product?.id]);

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
  
  async function loadSimilarProducts() {
    if (!product?.category || !product?.id) return;
    
    setSimilarLoading(true);
    try {
      const response = await listProducts({
        category: product.category,
        limit: 12
      }) as { products: ProductType[] };
      
      // Exclure le produit actuel et limiter à 4 produits
      const filtered = response.products
        .filter(p => p.id !== product.id && p.slug !== product.slug)
        .slice(0, 4);
      
      setSimilarProducts(filtered);
    } catch (error) {
      console.error('Erreur lors du chargement des produits similaires:', error);
      setSimilarProducts([]);
    } finally {
      setSimilarLoading(false);
    }
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
    addToCart(selectedVariant, product);
  };

  const isAvailable = selectedVariant && selectedVariant.stock > 0;

  // Navigation image
  const goToImage = (index: number) => {
    if (product?.images && index >= 0 && index < product.images.length) {
      setSelectedImage(index);
    }
  };

  // Badges subtils
  const isNewProduct = product?.createdAt ? (new Date().getTime() - new Date(product.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000 : false;
  const isPreorder = selectedVariant && selectedVariant.stock === 0 && !product?.outOfStock;

  // Caractéristiques discrètes (basées sur catégorie/nom)
  const getProductFeatures = () => {
    const features: Array<{ label: string; value: string }> = [];
    const nameLower = product?.name.toLowerCase() || '';
    const categoryLower = product?.category.toLowerCase() || '';

    // Détecter le type de produit
    if (nameLower.includes('display') || categoryLower.includes('display')) {
      features.push({ label: 'Type', value: 'Display 24 boosters' });
    } else if (nameLower.includes('etb') || nameLower.includes('elite trainer') || nameLower.includes('coffret')) {
      features.push({ label: 'Type', value: 'Coffret Dresseur d\'Élite' });
    } else if (nameLower.includes('upc') || nameLower.includes('ultra premium')) {
      features.push({ label: 'Type', value: 'Ultra Premium Collection' });
    } else if (nameLower.includes('booster')) {
      features.push({ label: 'Type', value: 'Booster' });
    }

    // Langue si disponible
    if (selectedVariant?.language) {
      features.push({ label: 'Langue', value: selectedVariant.language });
    }

    // Édition si disponible
    if (selectedVariant?.edition) {
      features.push({ label: 'Édition', value: selectedVariant.edition });
    }

    // État
    features.push({ label: 'État', value: 'Neuf et scellé' });

    return features;
  };

  const productFeatures = getProductFeatures();

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error || 'Produit introuvable'}</p>
          <button onClick={() => navigate('/produits')} className={styles.backLink}>
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Navigation retour discrète */}
      <nav className={styles.breadcrumb}>
        <button onClick={() => navigate(-1)} className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Retour</span>
        </button>
      </nav>

      {/* Zone principale — Produit */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          
          {/* Zone image dominante */}
          <div className={styles.productShowcase}>
            <div className={styles.imageContainer}>
              {product.images && product.images.length > 0 ? (
                <img 
                  src={product.images[selectedImage].url} 
                  alt={product.images[selectedImage].altText || product.name}
                  className={styles.productImage}
                />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
            </div>

            {/* Navigation images discrète */}
            {product.images && product.images.length > 1 && (
              <div className={styles.imageGallery}>
                <div className={styles.imageNav}>
                  {product.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToImage(index)}
                      className={`${styles.imageDot} ${selectedImage === index ? styles.active : ''}`}
                      aria-label={`Image ${index + 1}`}
                    />
                  ))}
                </div>
                {/* Miniatures images */}
                <div className={styles.imageThumbnails}>
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => goToImage(index)}
                      className={`${styles.thumbnail} ${selectedImage === index ? styles.thumbnailActive : ''}`}
                      aria-label={`Vue ${index + 1}`}
                    >
                      <img src={image.url} alt={image.altText || `${product.name} - vue ${index + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne information sobre */}
          <div className={styles.productInfo}>
            <header className={styles.productHeader}>
              {/* Badges subtils */}
              {(isNewProduct || isPreorder) && (
                <div className={styles.badgesContainer}>
                  {isNewProduct && (
                    <span className={styles.badge}>Nouveau</span>
                  )}
                  {isPreorder && (
                    <span className={styles.badge}>Précommande</span>
                  )}
                </div>
              )}

              <h1 className={styles.productName}>{product.name}</h1>
              
              {selectedVariant && (
                <p className={styles.productPrice}>
                  {formatPrice(selectedVariant.priceCents)} €
                </p>
              )}
            </header>

            {/* Caractéristiques discrètes */}
            {productFeatures.length > 0 && (
              <div className={styles.featuresSection}>
                <dl className={styles.featuresList}>
                  {productFeatures.map((feature, index) => (
                    <div key={index} className={styles.featureItem}>
                      <dt className={styles.featureLabel}>{feature.label}</dt>
                      <dd className={styles.featureValue}>{feature.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Sélection variante si plusieurs */}
            {product.variants.length > 1 && (
              <div className={styles.variantSection}>
                <label className={styles.variantLabel}>Version</label>
                <select
                  value={selectedVariantId || ''}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className={styles.variantSelect}
                >
                  {product.variants.map(variant => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                      {variant.language && ` — ${variant.language}`}
                      {variant.edition && ` (${variant.edition})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Signaux de confiance discrets */}
            <div className={styles.trustSignals}>
              <div className={styles.trustItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Authenticité garantie</span>
              </div>
              <div className={styles.trustItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 7h-4V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3H4a1 1 0 000 2h1v9a2 2 0 002 2h10a2 2 0 002-2V9h1a1 1 0 100-2z" />
                </svg>
                <span>Emballage sécurisé</span>
              </div>
            </div>

            {/* CTA unique */}
            <div className={styles.actionSection}>
              <button
                className={`${styles.addButton} ${!isAvailable ? styles.disabled : ''}`}
                onClick={handleAddToCart}
                disabled={!isAvailable}
              >
                {isAvailable ? 'Ajouter à ma collection' : 'Indisponible'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section Détails — Regroupe Description et Contenu */}
      <section className={styles.detailsSection}>
        <div className={styles.detailsContainer}>
          {/* Description */}
          {product.description && (
            <div className={styles.detailBlock}>
              <h2 className={styles.detailTitle}>À propos</h2>
              <div className={styles.detailContent}>
                <p className={styles.detailText}>{product.description}</p>
              </div>
            </div>
          )}

          {/* Contenu — Si Display ou Booster */}
          {(product.name.toLowerCase().includes('display') || product.name.toLowerCase().includes('booster') || product.name.toLowerCase().includes('etb')) && (
            <div className={styles.detailBlock}>
              <h2 className={styles.detailTitle}>Contenu</h2>
              <div className={styles.detailContent}>
                {product.name.toLowerCase().includes('display') ? (
                  <p className={styles.detailText}>
                    Ce display contient 24 boosters individuels, chacun contenant des cartes aléatoires de l'extension. 
                    Chaque booster inclut une carte rare minimum, avec possibilité de cartes ultra-rares, 
                    spéciales ou illustrées par des artistes renommés.
                  </p>
                ) : product.name.toLowerCase().includes('etb') || product.name.toLowerCase().includes('coffret') ? (
                  <p className={styles.detailText}>
                    Ce coffret dresseur d'élite contient des boosters, des dés, des marqueurs de dégâts, 
                    un guide du joueur et des accessoires exclusifs. Une expérience complète pour les collectionneurs 
                    et les joueurs.
                  </p>
                ) : (
                  <p className={styles.detailText}>
                    Chaque booster contient des cartes aléatoires de l'extension, avec une carte rare minimum. 
                    Possibilité de découvrir des cartes ultra-rares, spéciales ou illustrées par des artistes renommés.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section Produits similaires */}
      {similarProducts.length > 0 && (
        <section className={styles.similarSection}>
          <div className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>Produits similaires</h2>
            <div className={styles.similarGrid}>
              {similarProducts.map((similarProduct) => {
                const imageUrl = similarProduct.images?.[0]?.url || '/img/products/placeholder.png';
                const price = similarProduct.minPriceCents || 0;
                const inStock = similarProduct.variants?.some(v => v.stock > 0) || false;
                
                return (
                  <article
                    key={similarProduct.id}
                    className={styles.similarCard}
                    onClick={() => navigate(`/produit/${similarProduct.slug}`)}
                  >
                    <div className={styles.similarImageWrapper}>
                      <img
                        src={imageUrl}
                        alt={similarProduct.name}
                        className={styles.similarImage}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/img/products/placeholder.png';
                        }}
                      />
                    </div>

                    <div className={styles.similarContent}>
                      <h3 className={styles.similarName}>{similarProduct.name}</h3>
                      <div className={styles.similarFooter}>
                        <span className={styles.similarPrice}>
                          {price > 0 ? `${formatPrice(price)} €` : 'Prix sur demande'}
                        </span>
                        <span className={styles.similarAction}>
                          <ArrowRightIcon size={16} strokeWidth={1.5} />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Section Avis */}
      <section className={styles.reviewsSection}>
        <div className={styles.sectionContainer}>
          <header className={styles.reviewsHeader}>
            <h2 className={styles.sectionTitle}>Avis</h2>
            
            {reviewsData?.stats && reviewsData.stats.totalReviews > 0 && (
              <div className={styles.reviewsSummary}>
                <div className={styles.starsDisplay}>
                  {[...Array(5)].map((_, i) => (
                    <svg 
                      key={i} 
                      className={`${styles.starSvg} ${i < Math.round(reviewsData.stats.averageRating) ? styles.filled : ''}`} 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className={styles.reviewsCount}>
                  {reviewsData.stats.totalReviews} avis
                </span>
              </div>
            )}
          </header>

          {/* Bouton écrire un avis */}
          {!showReviewForm && (
            <div className={styles.reviewAction}>
              {submitSuccess ? (
                <p className={styles.thankYou}>Merci pour votre avis</p>
              ) : canReview?.canReview ? (
                <button className={styles.writeReviewBtn} onClick={() => setShowReviewForm(true)}>
                  Écrire un avis
                </button>
              ) : canReview?.reason === 'NOT_LOGGED_IN' ? (
                <a href="/connexion" className={styles.loginPrompt}>Se connecter pour donner son avis</a>
              ) : canReview?.reason === 'ALREADY_REVIEWED' ? (
                <p className={styles.reviewNote}>Vous avez déjà noté ce produit</p>
              ) : canReview?.reason === 'NOT_PURCHASED' ? (
                <p className={styles.reviewNote}>Réservé aux acheteurs</p>
              ) : null}
            </div>
          )}

          {/* Formulaire d'avis */}
          {showReviewForm && canReview?.canReview && (
            <div className={styles.reviewForm}>
              <form onSubmit={handleSubmitReview}>
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Note</label>
                  <div className={styles.starPicker}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className={`${styles.pickStar} ${star <= newReview.rating ? styles.picked : ''}`}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Titre <span className={styles.optional}>(facultatif)</span></label>
                  <input
                    type="text"
                    placeholder="En quelques mots..."
                    value={newReview.title}
                    onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                    maxLength={100}
                    className={styles.formInput}
                  />
                </div>
                
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Commentaire <span className={styles.optional}>(facultatif)</span></label>
                  <textarea
                    placeholder="Votre expérience..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    maxLength={1000}
                    rows={3}
                    className={styles.formTextarea}
                  />
                </div>
                
                {submitError && <p className={styles.formError}>{submitError}</p>}
                
                <div className={styles.formActions}>
                  <button type="button" onClick={() => setShowReviewForm(false)} className={styles.cancelBtn}>
                    Annuler
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    Publier
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Liste des avis */}
          {reviewsLoading ? (
            <div className={styles.reviewsLoading}>
              <div className={styles.spinner} />
            </div>
          ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
            <div className={styles.reviewsList}>
              {reviewsData.reviews.map((review) => (
                <article key={review.id} className={styles.reviewItem}>
                  <header className={styles.reviewMeta}>
                    <div className={styles.reviewAuthor}>
                      <span className={styles.authorName}>
                        {review.user.firstName || review.user.username}
                      </span>
                      {review.isVerified && (
                        <span className={styles.verifiedBadge}>Achat vérifié</span>
                      )}
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
                      <svg 
                        key={i} 
                        className={`${styles.starSmall} ${i < review.rating ? styles.filled : ''}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
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
            <p className={styles.noReviews}>Aucun avis pour le moment</p>
          )}
        </div>
      </section>
    </div>
  );
}
