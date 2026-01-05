import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../../cartContext';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { SearchIcon } from '../icons/Icons';
import type { Product } from '../../cartContext';
import styles from './ShopSection.module.css';

// Types pour les badges de rareté
type RarityBadge = 'Hot' | 'Drop' | 'Nouveauté' | 'Rare' | 'Essentials' | null;

// Détermine le badge de rareté d'un produit
function getRarityBadge(product: Product): RarityBadge {
  if (!product.createdAt) return null;

  const createdDate = new Date(product.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Nouveau si créé dans les 30 derniers jours
  if (createdDate > thirtyDaysAgo) {
    return 'Nouveauté';
  }

  // Hot si stock faible (moins de 10 unités totales)
  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  if (totalStock > 0 && totalStock < 10) {
    return 'Hot';
  }

  // Rare si prix élevé (plus de 100€)
  if (product.minPriceCents && product.minPriceCents > 10000) {
    return 'Rare';
  }

  // Essentials pour accessoires
  if (product.category?.toLowerCase() === 'accessoires') {
    return 'Essentials';
  }

  return null;
}

// Formatage du prix
function formatPrice(cents: number | null): string {
  if (cents === null) return 'Prix sur demande';
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

// Normalise la catégorie pour les filtres
function normalizeCategory(category: string | null): string {
  if (!category) return 'Toutes';
  const cat = category.toLowerCase();
  if (cat.includes('booster')) return 'Boosters';
  if (cat.includes('display')) return 'Displays';
  if (cat.includes('single') || cat.includes('carte')) return 'Singles';
  if (cat.includes('accessoire')) return 'Accessoires';
  return category;
}

export default function ShopSection() {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { isAuthenticated } = useAuth();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [viewMode, setViewMode] = useState<'comfort' | 'compact' | 'list' | 'wide'>('comfort');
  const [quickFilter, setQuickFilter] = useState<string>('all');

  // Charger tous les produits
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/products?limit=500`);
      if (!response.ok) {
        console.warn('Backend non disponible');
        setAllProducts([]);
        return;
      }
      const data = await response.json();
      setAllProducts(data.products || []);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // Obtenir les catégories uniques (uniquement TCG, sans accessoires)
  const categories = useMemo(() => {
    const cats = new Set<string>(['Toutes']);
    allProducts.forEach((p) => {
      const category = p.category?.toLowerCase() || '';
      // Exclure les accessoires
      if (!category.includes('accessoire')) {
        const normalized = normalizeCategory(p.category);
        if (normalized !== 'Toutes' && normalized !== 'Accessoires') {
          cats.add(normalized);
        }
      }
    });
    return Array.from(cats);
  }, [allProducts]);

  // Fonctions de détection pour les filtres rapides
  const isNewProduct = (product: Product): boolean => {
    if (!product.createdAt) return false;
    const createdDate = new Date(product.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate > thirtyDaysAgo;
  };

  const isBestSeller = (product: Product): boolean => {
    // Produits avec stock faible (moins de 10) = très demandés
    const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
    return totalStock > 0 && totalStock < 10;
  };

  const isFeatured = (product: Product): boolean => {
    // Produits récents (moins de 60 jours) avec bon stock
    if (!product.createdAt) return false;
    const createdDate = new Date(product.createdAt);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
    return createdDate > sixtyDaysAgo && totalStock > 5;
  };

  // Filtrer et trier les produits
  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Exclure les accessoires - ne garder que les produits TCG
    filtered = filtered.filter((p) => {
      const category = p.category?.toLowerCase() || '';
      return !category.includes('accessoire');
    });

    // Filtre rapide (onglets)
    if (quickFilter !== 'all') {
      switch (quickFilter) {
        case 'featured':
          filtered = filtered.filter(isFeatured);
          break;
        case 'new':
          filtered = filtered.filter(isNewProduct);
          break;
      }
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    // Filtre par catégorie
    if (selectedCategory !== 'Toutes') {
      filtered = filtered.filter((p) => normalizeCategory(p.category) === selectedCategory);
    }

    // Tri
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => {
          const priceA = a.minPriceCents ?? Infinity;
          const priceB = b.minPriceCents ?? Infinity;
          return priceA - priceB;
        });
        break;
      case 'price-desc':
        filtered.sort((a, b) => {
          const priceA = a.minPriceCents ?? -Infinity;
          const priceB = b.minPriceCents ?? -Infinity;
          return priceB - priceA;
        });
        break;
      case 'newest':
        filtered.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'popular':
      default:
        // Par défaut, trier par date de création (plus récents en premier)
        filtered.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return filtered;
  }, [allProducts, searchQuery, selectedCategory, sortBy, quickFilter]);

  // Gérer l'ajout au panier
  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/produit/${product.slug}` } });
      return;
    }

    if (!product.outOfStock && product.variants && product.variants.length > 0) {
      const availableVariant = product.variants.find((v) => v.stock > 0);
      if (availableVariant) {
        addToCart(availableVariant, product);
      } else if (product.slug) {
        navigate(`/produit/${product.slug}`);
      }
    }
  };

  // Gérer le clic sur une carte
  const handleCardClick = (product: Product) => {
    if (product.slug && !product.outOfStock) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(`/produit/${product.slug}`);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* En-tête de section — Allégé */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Collection</h2>
            {filteredProducts.length > 0 && (
              <div className={styles.productCount}>
                <span className={styles.countNumber}>{filteredProducts.length}</span>
                <span className={styles.countLabel}>
                  {filteredProducts.length === 1 ? 'produit' : 'produits'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bloc unifié : Filtres + Onglets + Produits */}
        <div className={styles.shopBlock}>
          {/* Barre de filtres */}
          <div className={styles.filtersBar}>
            <div className={styles.filtersRow}>
              {/* Recherche — Sans label */}
              <div className={styles.filterGroup}>
                <div className={styles.searchWrapper}>
                  <SearchIcon size={16} className={styles.searchIcon} />
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim() && quickFilter !== 'all') {
                        setQuickFilter('all');
                      }
                    }}
                    className={styles.searchInput}
                    aria-label="Rechercher un produit"
                  />
                </div>
              </div>

              {/* Filtre catégorie — Sans label */}
              <div className={styles.filterGroup}>
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={styles.filterSelect}
                  aria-label="Filtrer par catégorie"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tri — Sans label */}
              <div className={styles.filterGroup}>
                <select
                  id="sort-filter"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.filterSelect}
                  aria-label="Trier les produits"
                >
                  <option value="popular">Populaires</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix décroissant</option>
                  <option value="newest">Nouveautés</option>
                </select>
              </div>

              {/* Sélecteur de vue — Sans label */}
              <div className={styles.filterGroup}>
                <div className={styles.viewToggle} aria-label="Changer la vue">
                  <button
                    type="button"
                    onClick={() => setViewMode('comfort')}
                    className={`${styles.viewButton} ${viewMode === 'comfort' ? styles.viewButtonActive : ''}`}
                    aria-label="Vue confortable"
                    aria-pressed={viewMode === 'comfort'}
                    title="Vue confortable (2x2)"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <rect
                        x="3"
                        y="3"
                        width="5"
                        height="5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="12"
                        y="3"
                        width="5"
                        height="5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="3"
                        y="12"
                        width="5"
                        height="5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="12"
                        y="12"
                        width="5"
                        height="5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('compact')}
                    className={`${styles.viewButton} ${viewMode === 'compact' ? styles.viewButtonActive : ''}`}
                    aria-label="Vue compacte"
                    aria-pressed={viewMode === 'compact'}
                    title="Vue compacte (3x3)"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <rect
                        x="3"
                        y="3"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="8"
                        y="3"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="13"
                        y="3"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="3"
                        y="8"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="8"
                        y="8"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="13"
                        y="8"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="3"
                        y="13"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="8"
                        y="13"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="13"
                        y="13"
                        width="3"
                        height="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
                    aria-label="Vue liste"
                    aria-pressed={viewMode === 'list'}
                    title="Vue liste"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <line
                        x1="3"
                        y1="4"
                        x2="17"
                        y2="4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1="3"
                        y1="10"
                        x2="17"
                        y2="10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1="3"
                        y1="16"
                        x2="17"
                        y2="16"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('wide')}
                    className={`${styles.viewButton} ${viewMode === 'wide' ? styles.viewButtonActive : ''}`}
                    aria-label="Vue large"
                    aria-pressed={viewMode === 'wide'}
                    title="Vue large (1 colonne)"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <rect
                        x="3"
                        y="3"
                        width="14"
                        height="6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="3"
                        y="11"
                        width="14"
                        height="6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Onglets de filtres rapides */}
          <div className={styles.quickFilters}>
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className={`${styles.quickFilterButton} ${quickFilter === 'all' ? styles.quickFilterActive : ''}`}
            >
              <span>Tous</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('featured')}
              className={`${styles.quickFilterButton} ${quickFilter === 'featured' ? styles.quickFilterActive : ''}`}
            >
              <span>Produits phares</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('new')}
              className={`${styles.quickFilterButton} ${quickFilter === 'new' ? styles.quickFilterActive : ''}`}
            >
              <span>Nouveauté</span>
            </button>
          </div>

          {/* Grille de produits */}
          {loading ? (
            <div className={styles.loadingState}>
              <p>Chargement des produits...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Aucun résultat trouvé.</p>
              {(searchQuery || selectedCategory !== 'Toutes') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Toutes');
                  }}
                  className={styles.resetButton}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div
              className={`${styles.productsGrid} ${
                viewMode === 'compact'
                  ? styles.productsGridCompact
                  : viewMode === 'list'
                    ? styles.productsGridList
                    : viewMode === 'wide'
                      ? styles.productsGridWide
                      : ''
              }`}
            >
              {filteredProducts.map((product) => {
                const rarityBadge = getRarityBadge(product);
                const isBestSellerProduct = isBestSeller(product);
                const isFeaturedProduct = isFeatured(product);
                // Vérifier si le produit a vraiment une image valide
                const rawImageUrl = product.image?.url || product.images?.[0]?.url;
                // Normaliser l'URL : si c'est juste un nom de fichier, le transformer en chemin complet
                let imageUrl = '/img/products/placeholder.png';
                if (rawImageUrl) {
                  // Si l'URL commence par http, https, /, ou data:, c'est valide
                  if (
                    rawImageUrl.startsWith('http') ||
                    rawImageUrl.startsWith('/') ||
                    rawImageUrl.startsWith('data:')
                  ) {
                    imageUrl = rawImageUrl;
                  } else if (rawImageUrl.includes('.') && !rawImageUrl.includes(' ')) {
                    // Si c'est un nom de fichier valide (contient un point et pas d'espaces), essayer avec /img/products/
                    imageUrl = `/img/products/${rawImageUrl}`;
                  }
                }

                return (
                  <article
                    key={product.id}
                    className={styles.productCard}
                    onClick={() => handleCardClick(product)}
                  >
                    {/* Image avec effet holo */}
                    <div className={styles.cardImageWrapper}>
                      <div className={styles.holoEffect} />
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className={styles.cardImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          // Éviter les boucles infinies en vérifiant qu'on ne remplace pas déjà le placeholder
                          if (!target.src.includes('placeholder.png')) {
                            target.src = '/img/products/placeholder.png';
                            target.style.opacity = '1';
                          }
                        }}
                        onLoad={(e) => {
                          // S'assurer que l'image est bien chargée
                          const target = e.target as HTMLImageElement;
                          target.style.opacity = '1';
                        }}
                        style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
                      />

                      {/* Badges : Best-seller et Produit phare en priorité */}
                      {isBestSellerProduct && (
                        <div className={`${styles.rarityBadge} ${styles.rarityBadgeBestseller}`}>
                          Best-seller
                        </div>
                      )}
                      {isFeaturedProduct && !isBestSellerProduct && (
                        <div className={`${styles.rarityBadge} ${styles.rarityBadgeFeatured}`}>
                          Produit phare
                        </div>
                      )}
                      {/* Badge de rareté (si pas de badge spécial) */}
                      {!isBestSellerProduct && !isFeaturedProduct && rarityBadge && (
                        <div
                          className={`${styles.rarityBadge} ${
                            rarityBadge === 'Nouveauté'
                              ? styles.rarityBadgeNew
                              : rarityBadge === 'Hot'
                                ? styles.rarityBadgeHot
                                : rarityBadge === 'Rare'
                                  ? styles.rarityBadgeRare
                                  : rarityBadge === 'Drop'
                                    ? styles.rarityBadgeDrop
                                    : rarityBadge === 'Essentials'
                                      ? styles.rarityBadgeEssentials
                                      : ''
                          }`}
                        >
                          {rarityBadge}
                        </div>
                      )}

                      {/* Bouton ajouter au panier au survol */}
                      <div className={styles.hoverActions}>
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          disabled={product.outOfStock}
                          className={styles.addToCartButton}
                          aria-label={`Ajouter ${product.name} au panier`}
                        >
                          Ajouter au panier
                        </button>
                      </div>
                    </div>

                    {/* Contenu */}
                    <div className={styles.cardContent}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      {/* Description masquée pour alléger */}
                      <div className={styles.cardFooter}>
                        <span className={styles.productPrice}>
                          {formatPrice(product.minPriceCents)}
                        </span>
                        {product.outOfStock && (
                          <span className={styles.outOfStockLabel}>Rupture de stock</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
