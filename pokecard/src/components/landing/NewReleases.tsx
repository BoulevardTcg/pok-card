import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '../icons/Icons';
import { API_BASE, getImageUrl } from '../../api';
import { CartContext, type Product } from '../../cartContext';
import { NotifyModal } from '../NotifyModal';
import styles from './NewReleases.module.css';

type Universe = 'all' | 'pokemon' | 'onepiece' | 'yugioh';

const UNIVERSE_LABELS: Record<Universe, string> = {
  all: 'Tous',
  pokemon: 'Pokémon',
  onepiece: 'One Piece',
  yugioh: 'Yu-Gi-Oh!',
};

// Détermine l'univers à partir de la catégorie du produit
function getUniverse(product: Product): Exclude<Universe, 'all'> {
  const category = product.category?.toLowerCase() || '';

  if (category === 'one piece' || category === 'onepiece') {
    return 'onepiece';
  }
  if (category === 'yu-gi-oh' || category === 'yugioh') {
    return 'yugioh';
  }
  // Par défaut Pokémon (catégorie "Pokémon" ou "pokemon")
  return 'pokemon';
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
  const createdDate = new Date(product.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return createdDate > thirtyDaysAgo;
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
    return { status: 'low-stock', label: 'Stock limité', totalStock };
  }

  return {
    status: 'in-stock',
    label: 'En stock',
    totalStock,
  };
}

export default function NewReleases() {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const [activeUniverse, setActiveUniverse] = useState<Universe>('all');
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

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/products?limit=50`);
      if (!response.ok) {
        setProducts([]);
        return;
      }
      const data = await response.json();

      // Filtrer pour n'avoir que les produits TCG (exclure Accessoires)
      const tcgProducts = (data.products || []).filter((p: any) => {
        const category = p.category?.toLowerCase() || '';
        return (
          category === 'pokémon' ||
          category === 'pokemon' ||
          category === 'one piece' ||
          category === 'onepiece'
        );
      });

      // Trier par date de création (les plus récents en premier)
      const sortedProducts = tcgProducts.sort((a: any, b: any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setProducts(sortedProducts.slice(0, 9));
    } catch {
      // Ignorer les erreurs
    } finally {
      setLoading(false);
    }
  }

  // Filtrer par univers
  const filteredProducts =
    activeUniverse === 'all' ? products : products.filter((p) => getUniverse(p) === activeUniverse);

  // Obtenir les univers disponibles
  const availableUniverses = ['all', ...new Set(products.map((p) => getUniverse(p)))] as Universe[];

  // Formater le prix
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  // Obtenir le prix le plus bas du produit
  const getLowestPrice = (product: Product): number => {
    if (!product.variants || product.variants.length === 0) return 0;
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
            <span className={styles.overline}>Pour les chasseurs</span>
            <h2 className={styles.title}>Dernières sorties</h2>
            <p className={styles.description}>Boosters récents et précommandes disponibles.</p>
          </div>
        </div>

        {/* Universe Tabs */}
        <div className={styles.tabs}>
          {availableUniverses.map((universe) => (
            <button
              key={universe}
              onClick={() => setActiveUniverse(universe)}
              className={`${styles.tab} ${activeUniverse === universe ? styles.active : ''}`}
            >
              {UNIVERSE_LABELS[universe]}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className={styles.loadingWrapper}>
            <div className={styles.spinner} />
            <p>Chargement des produits...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <p>Aucun produit disponible pour le moment.</p>
          </div>
        ) : (
          /* Releases Grid */
          <div className={styles.releasesGrid}>
            {filteredProducts.map((product) => {
              const isNew = isNewProduct(product);
              const inStock = isInStock(product);
              const price = getLowestPrice(product);
              const productType = getProductType(product);
              const stockStatus = getStockStatus(product);
              const imageUrl = getImageUrl(
                product.images?.[0]?.url || '/img/products/placeholder.png'
              );

              return (
                <article
                  key={product.id}
                  className={styles.releaseCard}
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    navigate(`/produit/${product.slug}`);
                  }}
                >
                  <div className={styles.releaseImageWrapper}>
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className={styles.releaseImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/img/products/placeholder.png';
                      }}
                    />

                    {/* Status badges */}
                    {isNew && (
                      <div className={styles.statusBadges}>
                        <span className={styles.newBadge}>Nouveau</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.releaseContent}>
                    <div className={styles.releaseInfo}>
                      <span className={styles.releaseType}>{productType}</span>
                      <h3 className={styles.releaseName}>{product.name}</h3>
                      <div className={`${styles.stockStatus} ${styles[stockStatus.status]}`}>
                        {stockStatus.label}
                      </div>
                    </div>

                    <div className={styles.releaseFooter}>
                      <span className={styles.releasePrice}>
                        {price > 0 ? `${formatPrice(price)} €` : 'Prix sur demande'}
                      </span>
                      {inStock ? (
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
        )}

        {/* View all CTA */}
        <div className={styles.viewAllWrapper}>
          <button onClick={() => navigate('/produits')} className={styles.viewAllButton}>
            <span>Voir tous les produits</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>

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
