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
  const [canReview, setCanReview] = useState<{
    canReview: boolean;
    reason: string | null;
    message: string | null;
  } | null>(null);

  // États pour produits similaires
  const [similarProducts, setSimilarProducts] = useState<ProductType[]>([]);

  useEffect(() => {
    // Scroll to top quand on arrive sur la page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

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

  useEffect(() => {
    // Réinitialiser la quantité quand le produit ou la variante change
    setQuantity(1);
  }, [product?.id, selectedVariantId]);

  async function loadProduct() {
    if (!slug) {
      setLoading(false);
      setError('Slug manquant');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = (await getProduct(slug)) as { product: ProductType };

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
      const data = (await getProductReviews(product.id)) as ReviewsData;
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
      setCanReview({
        canReview: false,
        reason: 'NOT_LOGGED_IN',
        message: 'Connectez-vous pour laisser un avis',
      });
      return;
    }

    const result = await canReviewProduct(product.id);
    setCanReview(result);
  }

  async function loadSimilarProducts() {
    if (!product?.category || !product?.id) return;

    try {
      const response = (await listProducts({
        category: product.category,
        limit: 12,
      })) as { products: ProductType[] };

      // Exclure le produit actuel et limiter à 4 produits
      const filtered = response.products
        .filter((p) => p.id !== product.id && p.slug !== product.slug)
        .slice(0, 4);

      setSimilarProducts(filtered);
    } catch (error) {
      console.error('Erreur lors du chargement des produits similaires:', error);
      setSimilarProducts([]);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!product?.id || !isAuthenticated) return;

    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await createReview(
        product.id,
        newReview.rating,
        newReview.title || undefined,
        newReview.comment || undefined
      );
      setSubmitSuccess(true);
      setShowReviewForm(false);
      setNewReview({ rating: 5, title: '', comment: '' });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de l'envoi de l'avis");
    }
  }

  const selectedVariant = product?.variants.find((v) => v.id === selectedVariantId);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    if (selectedVariant.stock <= 0) return;

    // Vérifier l'authentification
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/produit/${product.slug}` } });
      return;
    }

    // Ajouter la quantité spécifiée
    for (let i = 0; i < quantity; i++) {
      addToCart(selectedVariant, product);
    }

    // Réinitialiser la quantité après ajout
    setQuantity(1);
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedVariant) return;
    const newQuantity = Math.max(1, Math.min(selectedVariant.stock, quantity + delta));
    setQuantity(newQuantity);
  };

  const isAvailable = selectedVariant && selectedVariant.stock > 0;

  // Navigation image
  const goToImage = (index: number) => {
    if (product?.images && index >= 0 && index < product.images.length) {
      setSelectedImage(index);
    }
  };

  // Navigation clavier pour images
  const handleImageKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToImage(index);
    }
  };

  const handleImageArrowKeys = (e: React.KeyboardEvent) => {
    if (!product?.images || product.images.length <= 1) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = selectedImage > 0 ? selectedImage - 1 : product.images.length - 1;
      goToImage(prevIndex);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = selectedImage < product.images.length - 1 ? selectedImage + 1 : 0;
      goToImage(nextIndex);
    }
  };

  // Badges subtils
  const isPreorder = selectedVariant && selectedVariant.stock === 0 && !product?.outOfStock;

  // Caractéristiques discrètes (basées sur catégorie/nom)
  const getProductFeatures = () => {
    const features: Array<{ label: string; value: string }> = [];
    const nameLower = product?.name.toLowerCase() || '';
    const categoryLower = product?.category.toLowerCase() || '';

    // Détecter le type de produit
    if (nameLower.includes('display') || categoryLower.includes('display')) {
      features.push({ label: 'Type', value: 'Display 24 boosters' });
    } else if (
      nameLower.includes('etb') ||
      nameLower.includes('elite trainer') ||
      nameLower.includes('coffret')
    ) {
      features.push({ label: 'Type', value: "Coffret Dresseur d'Élite" });
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
        <div
          className={styles.loadingState}
          role="status"
          aria-live="polite"
          aria-label="Chargement du produit"
        >
          <div className={styles.spinner} aria-hidden="true" />
          <span className="sr-only">Chargement du produit en cours...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState} role="alert">
          <p className={styles.errorText}>{error || 'Produit introuvable'}</p>
          <button
            onClick={() => navigate('/produits')}
            className={styles.backLink}
            aria-label="Retour à la liste des produits"
          >
            Retour aux produits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Navigation retour discrète */}
      <nav className={styles.breadcrumb} aria-label="Navigation">
        <button
          onClick={() => navigate(-1)}
          className={styles.backLink}
          aria-label="Retour à la page précédente"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Retour</span>
        </button>
      </nav>

      {/* Zone principale — Produit */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          {/* Rail gauche — Image + Produits similaires */}
          <div className={styles.leftRail}>
            {/* Zone image dominante */}
            <div className={styles.productShowcase}>
              <div
                className={styles.imageContainer}
                role="region"
                aria-label="Galerie d'images du produit"
                tabIndex={product.images && product.images.length > 1 ? 0 : -1}
                onKeyDown={handleImageArrowKeys}
              >
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[selectedImage].url}
                    alt={
                      product.images[selectedImage].altText ||
                      `${product.name} - Image ${selectedImage + 1} sur ${product.images.length}`
                    }
                    className={styles.productImage}
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className={styles.imagePlaceholder} aria-label="Image non disponible">
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Navigation images discrète */}
              {product.images && product.images.length > 1 && (
                <div
                  className={styles.imageGallery}
                  role="group"
                  aria-label="Navigation des images"
                >
                  <div className={styles.imageNav} role="tablist" aria-label="Indicateurs d'images">
                    {product.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToImage(index)}
                        onKeyDown={(e) => handleImageKeyDown(e, index)}
                        className={`${styles.imageDot} ${selectedImage === index ? styles.active : ''}`}
                        aria-label={`Afficher l'image ${index + 1} sur ${product.images.length}`}
                        aria-selected={selectedImage === index}
                        role="tab"
                        tabIndex={selectedImage === index ? 0 : -1}
                      />
                    ))}
                  </div>
                  {/* Miniatures images */}
                  <div
                    className={styles.imageThumbnails}
                    role="group"
                    aria-label="Miniatures des images"
                  >
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => goToImage(index)}
                        onKeyDown={(e) => handleImageKeyDown(e, index)}
                        className={`${styles.thumbnail} ${selectedImage === index ? styles.thumbnailActive : ''}`}
                        aria-label={`Afficher l'image ${index + 1} : ${image.altText || product.name}`}
                        aria-pressed={selectedImage === index}
                        tabIndex={0}
                      >
                        <img
                          src={image.url}
                          alt={image.altText || `${product.name} - vue ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section Produits similaires — Sous les images */}
            {similarProducts.length > 0 && (
              <section
                className={styles.similarSectionInline}
                aria-labelledby="similar-products-title"
              >
                <h2 id="similar-products-title" className={styles.similarSectionTitle}>
                  Produits similaires
                </h2>
                <div className={styles.similarGrid} role="list">
                  {similarProducts.map((similarProduct) => {
                    const imageUrl =
                      similarProduct.images?.[0]?.url || '/img/products/placeholder.png';
                    const price = similarProduct.minPriceCents || 0;

                    return (
                      <article
                        key={similarProduct.id}
                        className={styles.similarCard}
                        role="listitem"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          navigate(`/produit/${similarProduct.slug}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            navigate(`/produit/${similarProduct.slug}`);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Voir le produit ${similarProduct.name}`}
                      >
                        <div className={styles.similarImageWrapper}>
                          <img
                            src={imageUrl}
                            alt={`${similarProduct.name} - Image du produit`}
                            className={styles.similarImage}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/img/products/placeholder.png';
                            }}
                          />
                        </div>

                        <div className={styles.similarContent}>
                          <h3 className={styles.similarName}>{similarProduct.name}</h3>
                          <div className={styles.similarFooter}>
                            <span
                              className={styles.similarPrice}
                              aria-label={`Prix : ${price > 0 ? `${formatPrice(price)} euros` : 'Prix sur demande'}`}
                            >
                              {price > 0 ? `${formatPrice(price)} €` : 'Prix sur demande'}
                            </span>
                            <span className={styles.similarAction} aria-hidden="true">
                              <ArrowRightIcon size={16} strokeWidth={1.5} />
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Colonne information sobre */}
          <div className={styles.productInfo}>
            {/* Bloc Identity */}
            <div className={styles.infoPanel}>
              <header className={styles.productHeader}>
                {/* Badges subtils */}
                {isPreorder && (
                  <div className={styles.badgesContainer}>
                    <span className={styles.badge}>Précommande</span>
                  </div>
                )}

                <h1 className={styles.productName}>{product.name}</h1>

                {selectedVariant && (
                  <p className={styles.productPrice}>{formatPrice(selectedVariant.priceCents)} €</p>
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
            </div>

            {/* Bloc Purchase */}
            <div className={styles.purchasePanel}>
              {/* Sélection variante si plusieurs */}
              {product.variants.length > 1 && (
                <div className={styles.variantSection}>
                  <label htmlFor="variant-select" className={styles.variantLabel}>
                    Version
                  </label>
                  <select
                    id="variant-select"
                    value={selectedVariantId || ''}
                    onChange={(e) => {
                      setSelectedVariantId(e.target.value);
                      setQuantity(1); // Réinitialiser la quantité quand on change de variante
                    }}
                    className={styles.variantSelect}
                    aria-label="Sélectionner la version du produit"
                    aria-required="true"
                  >
                    {product.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}
                        {variant.language && ` — ${variant.language}`}
                        {variant.edition && ` (${variant.edition})`}
                        {variant.stock <= 0 && ' — Épuisé'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sélecteur de quantité */}
              {isAvailable && selectedVariant && (
                <div className={styles.quantitySection}>
                  <label htmlFor="quantity-display" className={styles.quantityLabel}>
                    Quantité
                  </label>
                  <div
                    className={styles.quantityControls}
                    role="group"
                    aria-label="Sélecteur de quantité"
                  >
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      aria-label="Diminuer la quantité"
                      aria-controls="quantity-display"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="sr-only">Diminuer</span>
                    </button>
                    <span
                      id="quantity-display"
                      className={styles.quantityValue}
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= selectedVariant.stock}
                      aria-label="Augmenter la quantité"
                      aria-controls="quantity-display"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="sr-only">Augmenter</span>
                    </button>
                  </div>
                  {selectedVariant.stock > 0 && (
                    <span className="sr-only" aria-live="polite">
                      {selectedVariant.stock}{' '}
                      {selectedVariant.stock === 1 ? 'exemplaire' : 'exemplaires'} disponible
                      {selectedVariant.stock > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* CTA unique */}
              <div className={styles.actionSection}>
                <button
                  className={`${styles.addButton} ${!isAvailable ? styles.disabled : ''}`}
                  onClick={handleAddToCart}
                  disabled={!isAvailable}
                  aria-label={
                    isAvailable
                      ? isPreorder
                        ? 'Précommander ce produit'
                        : `Ajouter ${quantity} ${quantity > 1 ? 'exemplaires' : 'exemplaire'} à ma collection`
                      : 'Produit indisponible'
                  }
                  aria-describedby={isAvailable && selectedVariant ? 'stock-info' : undefined}
                >
                  {isAvailable
                    ? isPreorder
                      ? 'Précommander'
                      : 'Ajouter à ma collection'
                    : 'Indisponible'}
                </button>
                {isAvailable && selectedVariant && (
                  <span id="stock-info" className="sr-only">
                    Stock disponible : {selectedVariant.stock}{' '}
                    {selectedVariant.stock === 1 ? 'exemplaire' : 'exemplaires'}
                  </span>
                )}
              </div>

              {/* Signaux de confiance discrets */}
              <div className={styles.trustSignals}>
                <div className={styles.trustItem}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Authenticité garantie</span>
                </div>
                <div className={styles.trustItem}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M20 7h-4V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3H4a1 1 0 000 2h1v9a2 2 0 002 2h10a2 2 0 002-2V9h1a1 1 0 100-2z" />
                  </svg>
                  <span>Emballage sécurisé</span>
                </div>
              </div>
            </div>

            {/* Bloc Editorial */}
            <div className={styles.editorialPanel}>
              {/* Description et Contenu — Intégrés dans la colonne */}
              {product.description && (
                <div className={styles.descriptionBlock}>
                  <h3 className={styles.descriptionTitle}>Description</h3>
                  <div className={styles.descriptionContent}>
                    <p className={styles.descriptionText}>{product.description}</p>
                  </div>
                </div>
              )}

              {/* Contenu — Si Display ou Booster */}
              {(product.name.toLowerCase().includes('display') ||
                product.name.toLowerCase().includes('booster') ||
                product.name.toLowerCase().includes('etb')) && (
                <div className={styles.descriptionBlock}>
                  <h3 className={styles.descriptionTitle}>Contenu</h3>
                  <div className={styles.descriptionContent}>
                    {product.name.toLowerCase().includes('display') ? (
                      <>
                        <div className={styles.contentSummary}>
                          <span className={styles.contentItem}>24 boosters</span>
                          <span className={styles.contentSeparator}>•</span>
                          <span className={styles.contentItem}>1 rare min.</span>
                        </div>
                        <p className={styles.descriptionText}>
                          Chaque booster contient des cartes aléatoires de l'extension, avec
                          possibilité de cartes ultra-rares, spéciales ou illustrées par des
                          artistes renommés.
                        </p>
                      </>
                    ) : product.name.toLowerCase().includes('etb') ||
                      product.name.toLowerCase().includes('coffret') ? (
                      <>
                        <div className={styles.contentSummary}>
                          <span className={styles.contentItem}>Boosters</span>
                          <span className={styles.contentSeparator}>•</span>
                          <span className={styles.contentItem}>Dés & marqueurs</span>
                          <span className={styles.contentSeparator}>•</span>
                          <span className={styles.contentItem}>Guide joueur</span>
                        </div>
                        <p className={styles.descriptionText}>
                          Une expérience complète pour les collectionneurs et les joueurs.
                        </p>
                      </>
                    ) : (
                      <p className={styles.descriptionText}>
                        Chaque booster contient des cartes aléatoires de l'extension, avec une carte
                        rare minimum. Possibilité de découvrir des cartes ultra-rares, spéciales ou
                        illustrées par des artistes renommés.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section Avis */}
      <section className={styles.reviewsSection} aria-labelledby="reviews-title">
        <div className={styles.sectionContainer}>
          <header className={styles.reviewsHeader}>
            <h2 id="reviews-title" className={styles.sectionTitle}>
              Avis
            </h2>

            {reviewsData?.stats && reviewsData.stats.totalReviews > 0 && (
              <div
                className={styles.reviewsSummary}
                role="group"
                aria-label={`Note moyenne : ${reviewsData.stats.averageRating.toFixed(1)} sur 5 étoiles`}
              >
                <div
                  className={styles.starsDisplay}
                  role="img"
                  aria-label={`${reviewsData.stats.averageRating.toFixed(1)} étoiles sur 5`}
                >
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`${styles.starSvg} ${i < Math.round(reviewsData.stats.averageRating) ? styles.filled : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span
                  className={styles.reviewsCount}
                  aria-label={`${reviewsData.stats.totalReviews} ${reviewsData.stats.totalReviews === 1 ? 'avis' : 'avis'}`}
                >
                  {reviewsData.stats.totalReviews} avis
                </span>
              </div>
            )}
          </header>

          {/* Bouton écrire un avis */}
          {!showReviewForm && (
            <div className={styles.reviewAction}>
              {submitSuccess ? (
                <p className={styles.thankYou} role="status" aria-live="polite">
                  Merci pour votre avis
                </p>
              ) : canReview?.canReview ? (
                <button
                  className={styles.writeReviewBtn}
                  onClick={() => setShowReviewForm(true)}
                  aria-label="Écrire un avis sur ce produit"
                >
                  Écrire un avis
                </button>
              ) : canReview?.reason === 'NOT_LOGGED_IN' ? (
                <a
                  href="/login"
                  className={styles.loginPrompt}
                  aria-label="Se connecter pour donner son avis"
                >
                  Se connecter pour donner son avis
                </a>
              ) : canReview?.reason === 'ALREADY_REVIEWED' ? (
                <p className={styles.reviewNote} role="status">
                  Vous avez déjà noté ce produit
                </p>
              ) : canReview?.reason === 'NOT_PURCHASED' ? (
                <p className={styles.reviewNote} role="status">
                  Réservé aux acheteurs
                </p>
              ) : null}
            </div>
          )}

          {/* Formulaire d'avis */}
          {showReviewForm && canReview?.canReview && (
            <div className={styles.reviewForm}>
              <form onSubmit={handleSubmitReview} aria-label="Formulaire d'avis">
                <div className={styles.formRow}>
                  <fieldset>
                    <legend className={styles.formLabel}>
                      Note{' '}
                      <span className={styles.required} aria-label="requis">
                        *
                      </span>
                    </legend>
                    <div
                      className={styles.starPicker}
                      role="radiogroup"
                      aria-label="Sélectionner une note de 1 à 5 étoiles"
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className={`${styles.pickStar} ${star <= newReview.rating ? styles.picked : ''}`}
                          aria-label={`Noter ${star} ${star === 1 ? 'étoile' : 'étoiles'}`}
                          aria-pressed={star <= newReview.rating}
                          role="radio"
                          aria-checked={star <= newReview.rating}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="sr-only">
                            {star} {star === 1 ? 'étoile' : 'étoiles'}
                          </span>
                        </button>
                      ))}
                    </div>
                    <span className="sr-only" aria-live="polite">
                      Note sélectionnée : {newReview.rating}{' '}
                      {newReview.rating === 1 ? 'étoile' : 'étoiles'} sur 5
                    </span>
                  </fieldset>
                </div>

                <div className={styles.formRow}>
                  <label htmlFor="review-title" className={styles.formLabel}>
                    Titre <span className={styles.optional}>(facultatif)</span>
                  </label>
                  <input
                    id="review-title"
                    type="text"
                    placeholder="En quelques mots..."
                    value={newReview.title}
                    onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                    maxLength={100}
                    className={styles.formInput}
                    aria-describedby="review-title-help"
                  />
                  <span id="review-title-help" className="sr-only">
                    {newReview.title.length}/100 caractères
                  </span>
                </div>

                <div className={styles.formRow}>
                  <label htmlFor="review-comment" className={styles.formLabel}>
                    Commentaire <span className={styles.optional}>(facultatif)</span>
                  </label>
                  <textarea
                    id="review-comment"
                    placeholder="Votre expérience..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    maxLength={1000}
                    rows={3}
                    className={styles.formTextarea}
                    aria-describedby="review-comment-help"
                  />
                  <span id="review-comment-help" className="sr-only">
                    {newReview.comment.length}/1000 caractères
                  </span>
                </div>

                {submitError && (
                  <p className={styles.formError} role="alert" aria-live="assertive">
                    {submitError}
                  </p>
                )}

                <div className={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className={styles.cancelBtn}
                    aria-label="Annuler l'écriture de l'avis"
                  >
                    Annuler
                  </button>
                  <button type="submit" className={styles.submitBtn} aria-label="Publier l'avis">
                    Publier
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste des avis */}
          {reviewsLoading ? (
            <div
              className={styles.reviewsLoading}
              role="status"
              aria-live="polite"
              aria-label="Chargement des avis"
            >
              <div className={styles.spinner} aria-hidden="true" />
              <span className="sr-only">Chargement des avis en cours...</span>
            </div>
          ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
            <div className={styles.reviewsList} role="list">
              {reviewsData.reviews.map((review) => (
                <article key={review.id} className={styles.reviewItem} role="listitem">
                  <header className={styles.reviewMeta}>
                    <div className={styles.reviewAuthor}>
                      <span className={styles.authorName}>
                        {review.user.firstName || review.user.username}
                      </span>
                      {review.isVerified && (
                        <span className={styles.verifiedBadge} aria-label="Achat vérifié">
                          Achat vérifié
                        </span>
                      )}
                    </div>
                    <time
                      className={styles.reviewDate}
                      dateTime={review.createdAt}
                      aria-label={`Publié le ${new Date(review.createdAt).toLocaleDateString(
                        'fr-FR',
                        {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }
                      )}`}
                    >
                      {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  </header>

                  <div
                    className={styles.reviewStars}
                    role="img"
                    aria-label={`${review.rating} ${review.rating === 1 ? 'étoile' : 'étoiles'} sur 5`}
                  >
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`${styles.starSmall} ${i < review.rating ? styles.filled : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
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
            <p className={styles.noReviews} role="status">
              Aucun avis pour le moment
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
