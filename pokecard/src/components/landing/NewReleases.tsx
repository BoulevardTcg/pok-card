import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '../icons/Icons';
import { API_BASE } from '../../api';
import styles from './NewReleases.module.css';

type Universe = 'all' | 'pokemon' | 'onepiece' | 'yugioh';

interface ProductVariant {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
}

interface ProductImage {
  url: string;
  altText?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  variants: ProductVariant[];
  images: ProductImage[];
  createdAt: string;
}

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

export default function NewReleases() {
  const navigate = useNavigate();
  const [activeUniverse, setActiveUniverse] = useState<Universe>('all');
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

      // Filtrer pour n'avoir que les produits TCG (exclure Accessoires)
      const tcgProducts = (data.products || []).filter((p: Product) => {
        const category = p.category?.toLowerCase() || '';
        return (
          category === 'pokémon' ||
          category === 'pokemon' ||
          category === 'one piece' ||
          category === 'onepiece'
        );
      });

      // Trier par date de création (les plus récents en premier)
      const sortedProducts = tcgProducts.sort((a: Product, b: Product) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setProducts(sortedProducts.slice(0, 8)); // Prendre les 8 plus récents
    } catch (error) {
      console.error('Erreur:', error);
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

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.overline}>Pour les chasseurs</span>
            <h2 className={styles.title}>Dernières sorties</h2>
            <p className={styles.description}>
              Boosters fraîchement sortis, précommandes ouvertes — tout ce qu'il faut pour le
              frisson de l'ouverture.
            </p>
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
              const imageUrl = product.images?.[0]?.url || '/img/products/placeholder.png';

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
                    <div className={styles.statusBadges}>
                      {isNew && <span className={styles.newBadge}>Nouveau</span>}
                      {!inStock && <span className={styles.preorderBadge}>Rupture</span>}
                    </div>
                  </div>

                  <div className={styles.releaseContent}>
                    <div className={styles.releaseInfo}>
                      <span className={styles.releaseType}>{productType}</span>
                      <h3 className={styles.releaseName}>{product.name}</h3>
                      <span className={styles.releaseDate}>
                        {inStock ? 'Disponible' : 'Bientôt disponible'}
                      </span>
                    </div>

                    <div className={styles.releaseFooter}>
                      <span className={styles.releasePrice}>
                        {price > 0 ? `${formatPrice(price)} €` : 'Prix sur demande'}
                      </span>
                      <span className={styles.releaseAction}>
                        <ArrowRightIcon size={16} />
                      </span>
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
      </div>
    </section>
  );
}
