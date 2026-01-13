import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext, useRef } from 'react';
import { ArrowUpRightIcon } from '../icons/Icons';
import { API_BASE, getImageUrl } from '../../api';
import { CartContext, type Product } from '../../cartContext';
import { NotifyModal } from '../NotifyModal';
import { getProductType as getProductTypeFromUtils, productTypeLabels } from '../../utils/filters';
import styles from './FeaturedCards.module.css';

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
    return { status: 'low-stock', label: 'Stock limité', totalStock };
  }

  return {
    status: 'in-stock',
    label: 'En stock',
    totalStock,
  };
}

// Fonction pour obtenir la langue du produit
function getProductLanguage(product: Product): string {
  if (!product.variants || product.variants.length === 0) return 'N/A';

  // Prendre la langue de la première variante disponible
  const firstVariant = product.variants.find((v) => v.language) || product.variants[0];
  return firstVariant.language || 'N/A';
}

// Vérifie si le produit est récent (moins de 30 jours)
function isNewProduct(product: Product): boolean {
  if (!product.createdAt) return false;
  const createdDate = new Date(product.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return createdDate > thirtyDaysAgo;
}

export default function FeaturedCards() {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyModal, setNotifyModal] = useState<{
    isOpen: boolean;
    productId: string;
    productName: string;
    variantId?: string;
  }>({
    isOpen: false,
    productId: '',
    productName: '',
  });

  // Carousel state
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadProducts();
  }, []);

  // Check scroll position and update active index
  const checkScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

      // Calculate active index for pagination dots
      const cardWidth = carouselRef.current.querySelector('article')?.offsetWidth || 200;
      const gap = 16;
      const newIndex = Math.round(scrollLeft / (cardWidth + gap));
      setActiveIndex(Math.min(newIndex, products.length - 1));
    }
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScrollButtons);
      // Initial check
      checkScrollButtons();
      return () => carousel.removeEventListener('scroll', checkScrollButtons);
    }
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.querySelector('article')?.offsetWidth || 300;
      const gap = 24; // gap between cards
      const scrollAmount = (cardWidth + gap) * 2; // Scroll 2 cards at a time

      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  async function loadProducts() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/products?limit=50`);
      if (!response.ok) {
        console.warn('Backend non disponible, affichage des produits désactivé');
        setProducts([]);
        return;
      }
      const data = await response.json();

      // Filtrer pour n'avoir que les produits scellés (exclure Accessoires)
      const sealedProducts = (data.products || []).filter((p: Product) => {
        const category = p.category?.toLowerCase() || '';
        return (
          category !== 'accessoires' &&
          (category === 'pokémon' ||
            category === 'pokemon' ||
            category === 'one piece' ||
            category === 'onepiece')
        );
      });

      // Trier par date de création et prendre les 12 premiers pour le carrousel
      const sortedProducts = sealedProducts.sort((a: Product, b: Product) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setProducts(sortedProducts.slice(0, 12));
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // Formater le prix
  const formatPrice = (cents: number | null) => {
    if (!cents) return 'Prix sur demande';
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  // Obtenir le prix le plus bas du produit
  const getLowestPrice = (product: Product): number | null => {
    if (!product.variants || product.variants.length === 0) return null;
    return Math.min(...product.variants.map((v) => v.priceCents));
  };

  // Vérifier si en stock
  const isInStock = (product: Product): boolean => {
    return product.variants.some((v) => v.stock > 0);
  };

  // Gérer l'ajout au panier
  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();

    if (!product.outOfStock && product.variants && product.variants.length > 0) {
      const availableVariant = product.variants.find((v) => v.stock > 0);
      if (availableVariant) {
        addToCart(availableVariant, product);
      }
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.overline}>À la une</span>
            <h2 className={styles.title}>Produits phares</h2>
            <p className={styles.description}>
              Notre sélection de produits scellés pour tous les passionnés.
            </p>
          </div>

          <div className={styles.headerActions}>
            {/* Navigation Arrows */}
            <div className={styles.carouselNav}>
              <button
                className={`${styles.navButton} ${!canScrollLeft ? styles.disabled : ''}`}
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                aria-label="Produits précédents"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                className={`${styles.navButton} ${!canScrollRight ? styles.disabled : ''}`}
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                aria-label="Produits suivants"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <button onClick={() => navigate('/produits')} className={styles.viewAllButton}>
              <span>Voir tout</span>
              <ArrowUpRightIcon size={16} />
            </button>
          </div>
        </div>

        {/* Carousel */}
        {loading ? (
          <div className={styles.loadingWrapper}>
            <div className={styles.spinner} />
            <p>Chargement des produits...</p>
          </div>
        ) : products.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <p>Aucun produit disponible pour le moment.</p>
          </div>
        ) : (
          <div className={styles.carouselWrapper}>
            {/* Swipe hint pour mobile */}
            <div className={styles.swipeHint}>
              <span className={styles.swipeIcon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 5l7 7-7 7" />
                  <path d="M3 12h18" />
                </svg>
              </span>
              <span>Swiper pour voir plus</span>
            </div>

            <div ref={carouselRef} className={styles.carousel}>
              {products.map((product) => {
                const isNew = isNewProduct(product);
                const inStock = isInStock(product);
                const price = getLowestPrice(product);
                const productType = getProductTypeFromUtils(product);
                const language = getProductLanguage(product);
                const stockStatus = getStockStatus(product);
                const imageUrl = getImageUrl(
                  product.images?.[0]?.url || '/img/products/placeholder.png'
                );

                return (
                  <article
                    key={product.id}
                    className={styles.card}
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      navigate(`/produit/${product.slug}`);
                    }}
                  >
                    {/* Image */}
                    <div className={styles.cardImageWrapper}>
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className={styles.cardImage}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/img/products/placeholder.png';
                        }}
                      />

                      {/* Badge */}
                      {isNew && <div className={styles.badge}>Nouveau</div>}
                    </div>

                    {/* Content */}
                    <div className={styles.cardContent}>
                      <div className={styles.cardInfo}>
                        <div className={styles.categoryLabel}>{product.category}</div>
                        <h3 className={styles.cardName}>{product.name}</h3>
                        <div className={styles.cardMeta}>
                          <span className={styles.metaItem}>{productTypeLabels[productType]}</span>
                          <span className={styles.metaItem}>{language}</span>
                        </div>
                        <div className={`${styles.stockStatus} ${styles[stockStatus.status]}`}>
                          {stockStatus.label}
                        </div>
                      </div>

                      <div className={styles.cardFooter}>
                        <span className={styles.priceValue}>
                          {price ? `${formatPrice(price)} €` : 'Prix sur demande'}
                        </span>
                        {inStock && !product.outOfStock ? (
                          <button
                            className={styles.addToCartButton}
                            onClick={(e) => handleAddToCart(e, product)}
                          >
                            Ajouter
                          </button>
                        ) : (
                          <button
                            className={styles.notifyButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifyModal({
                                isOpen: true,
                                productId: product.id,
                                productName: product.name,
                              });
                            }}
                          >
                            Me prévenir
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Fade indicator pour montrer qu'il y a plus */}
            {canScrollRight && <div className={styles.fadeRight} />}

            {/* Pagination dots pour mobile */}
            <div className={styles.paginationDots}>
              {products.slice(0, Math.min(6, products.length)).map((_, index) => (
                <span
                  key={index}
                  className={`${styles.dot} ${index === Math.min(activeIndex, 5) ? styles.dotActive : ''}`}
                />
              ))}
              {products.length > 6 && (
                <span className={styles.dotMore}>+{products.length - 6}</span>
              )}
            </div>
          </div>
        )}

        {/* Notify Modal */}
        <NotifyModal
          isOpen={notifyModal.isOpen}
          onClose={() => setNotifyModal({ ...notifyModal, isOpen: false })}
          productId={notifyModal.productId}
          productName={notifyModal.productName}
          variantId={notifyModal.variantId}
        />
      </div>
    </section>
  );
}
