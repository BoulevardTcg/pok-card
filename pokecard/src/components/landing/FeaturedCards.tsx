import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowUpRightIcon } from '../icons/Icons';
import { API_BASE } from '../../api';
import type { Product } from '../../cartContext';
import styles from './FeaturedCards.module.css';

// Détermine l'univers à partir de la catégorie du produit
function getUniverse(product: Product): 'Pokémon' | 'One Piece' | 'Yu-Gi-Oh' | 'Autre' {
  const category = product.category?.toLowerCase() || '';

  if (category === 'one piece' || category === 'onepiece') {
    return 'One Piece';
  }
  if (category === 'yu-gi-oh' || category === 'yugioh') {
    return 'Yu-Gi-Oh';
  }
  if (category === 'pokémon' || category === 'pokemon') {
    return 'Pokémon';
  }
  return 'Autre';
}

// Détermine le type de produit à partir de la catégorie
function getProductType(product: Product): string {
  const category = product.category?.toLowerCase() || '';
  const name = product.name.toLowerCase();

  if (category.includes('display') || name.includes('display')) return 'Display';
  if (
    category.includes('etb') ||
    name.includes('elite trainer') ||
    name.includes('coffret dresseur')
  )
    return "Coffret Dresseur d'Élite";
  if (category.includes('upc') || name.includes('ultra premium')) return 'Ultra Premium Collection';
  if (category.includes('booster') || name.includes('booster')) return 'Booster';
  if (category.includes('coffret') || name.includes('coffret')) return 'Coffret';
  return product.category || 'Produit scellé';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/products?limit=50`);
      if (!response.ok) {
        // Si le backend n'est pas disponible, ne pas afficher d'erreur
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

      // Trier par date de création (les plus récents en premier) et prendre les 4 premiers
      const sortedProducts = sealedProducts.sort((a: Product, b: Product) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setProducts(sortedProducts.slice(0, 4));
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

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.overline}>À la une</span>
            <h2 className={styles.title}>Produits phares</h2>
            <p className={styles.description}>
              Boosters, displays, coffrets ETB et collections premium — notre sélection de produits
              scellés pour tous les passionnés.
            </p>
          </div>

          <button onClick={() => navigate('/produits')} className={styles.viewAllButton}>
            <span>Voir tout le catalogue</span>
            <ArrowUpRightIcon size={16} />
          </button>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className={styles.loadingWrapper}>
            <p>Chargement des produits...</p>
          </div>
        ) : products.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <p>Aucun produit disponible pour le moment.</p>
          </div>
        ) : (
          <div className={styles.itemsGrid}>
            {products.map((product) => {
              const isNew = isNewProduct(product);
              const inStock = isInStock(product);
              const price = getLowestPrice(product);
              const productType = getProductType(product);
              const universe = getUniverse(product);
              const imageUrl = product.images?.[0]?.url || '/img/products/placeholder.png';

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
                    <div className={styles.cardImageOverlay} />

                    {/* Badge */}
                    {isNew && (
                      <div className={`${styles.badge} ${styles.nouveauté}`}>Nouveauté</div>
                    )}

                    {/* Stock indicator */}
                    {inStock && (
                      <div className={styles.stockBadge}>
                        <span className={styles.stockDot} />
                        En stock
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className={styles.cardContent}>
                    {/* Info */}
                    <div className={styles.cardInfo}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardUniverse}>{universe}</span>
                        {productType && (
                          <>
                            <span className={styles.metaDot}>·</span>
                            <span className={styles.cardType}>{productType}</span>
                          </>
                        )}
                      </div>
                      <h3 className={styles.cardName}>{product.name}</h3>
                      <span className={styles.cardSubtitle}>
                        {product.description
                          ? product.description.length > 60
                            ? product.description.substring(0, 60) + '...'
                            : product.description
                          : productType}
                      </span>
                    </div>

                    {/* Price */}
                    <div className={styles.cardPricing}>
                      <div className={styles.priceRow}>
                        <span className={styles.priceValue}>
                          {price ? `${formatPrice(price)} €` : 'Prix sur demande'}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
