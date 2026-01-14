import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './ProductsPage.module.css';
import { listProducts } from './api';
import type { Product as ProductType } from './cartContext';
import FilterBar from './components/catalogue/FilterBar';
import ProductGrid from './components/catalogue/ProductGrid';
import Breadcrumb from './components/Breadcrumb';
import { useViewPreference } from './hooks/useViewPreference';
import {
  GameCategory,
  ProductType as ProductTypeEnum,
  Availability,
  filterByGameCategories,
  filterByProductTypes,
  filterByAvailability,
  filterByPriceRange,
  filterByLanguages,
  parseCategoriesFromString,
  parseTypesFromString,
  parseAvailabilityFromString,
  parsePriceRangeFromString,
  parseLanguagesFromString,
  categoriesToString,
  typesToString,
  availabilityToString,
  priceRangeToString,
  languagesToString,
} from './utils/filters';

// Fonction pour vérifier si un produit est nouveau (moins de 30 jours)
function isNewProduct(product: ProductType): boolean {
  if (!product.createdAt) return false;
  const createdDate = new Date(product.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return createdDate > thirtyDaysAgo;
}

// Fonction pour vérifier si un produit est en stock
function isInStock(product: ProductType): boolean {
  if (product.outOfStock) return false;
  if (!product.variants || product.variants.length === 0) return false;
  return product.variants.some((v) => v.stock > 0);
}

// Fonction pour vérifier si un produit a une vraie image (pas placeholder)
function hasRealImage(product: ProductType): boolean {
  const placeholderUrl = '/img/products/placeholder.png';
  const imageUrl = product.images?.[0]?.url || product.image?.url;
  if (!imageUrl) return false;
  // Vérifier que ce n'est pas le placeholder
  return !imageUrl.includes('placeholder.png') && imageUrl !== placeholderUrl;
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const productsPerPage = 12;

  // Récupération des filtres depuis les query params avec valeurs par défaut
  const sortBy = searchParams.get('sort') || 'relevance';
  const selectedGameCategories = useMemo(
    () => parseCategoriesFromString(searchParams.get('categories')),
    [searchParams]
  );
  const selectedProductTypes = useMemo(
    () => parseTypesFromString(searchParams.get('types')),
    [searchParams]
  );
  const selectedAvailability = useMemo(
    () => parseAvailabilityFromString(searchParams.get('availability')),
    [searchParams]
  );

  // Récupération des filtres Prix et Langue depuis les query params
  const selectedPriceRange = useMemo(() => {
    const priceRangeStr = searchParams.get('price');
    return parsePriceRangeFromString(priceRangeStr);
  }, [searchParams]);

  const selectedLanguages = useMemo(
    () => parseLanguagesFromString(searchParams.get('languages')),
    [searchParams]
  );

  // État local indépendant pour la recherche du catalogue (non synchronisé avec la navbar)
  // Initialisation uniquement si on arrive depuis la navbar avec un paramètre search
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>(() => {
    // Si on arrive depuis la navbar avec ?search=..., initialiser avec cette valeur
    // mais ensuite les deux seront indépendants
    const initialSearch = searchParams.get('search') || '';
    return initialSearch;
  });

  const [activeTab, setActiveTab] = useState<'Tous' | 'Produits phares' | 'Nouveauté'>('Tous');
  const [viewMode, setViewMode] = useViewPreference('grid');

  // Filtrer et trier les produits selon les critères
  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Filtre par recherche du catalogue (OR entre les champs)
    // Utilise l'état local indépendant de la navbar
    if (catalogSearchQuery) {
      const query = catalogSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Filtre par catégories de jeu (OR au sein de la même catégorie)
    // Si plusieurs catégories sélectionnées, produit doit correspondre à l'une d'elles
    if (selectedGameCategories.length > 0) {
      filtered = filterByGameCategories(filtered, selectedGameCategories);
    }

    // Filtre par types de produits (OR au sein du même type)
    // Si plusieurs types sélectionnés, produit doit correspondre à l'un d'eux
    if (selectedProductTypes.length > 0) {
      filtered = filterByProductTypes(filtered, selectedProductTypes);
    }

    // Filtre par disponibilité
    if (selectedAvailability.length > 0) {
      filtered = filterByAvailability(filtered, selectedAvailability);
    }

    // Filtre par prix
    if (selectedPriceRange.min !== null || selectedPriceRange.max !== null) {
      filtered = filterByPriceRange(filtered, selectedPriceRange.min, selectedPriceRange.max);
    }

    // Filtre par langue
    if (selectedLanguages.length > 0) {
      filtered = filterByLanguages(filtered, selectedLanguages);
    }

    // Filtre par onglet actif
    if (activeTab === 'Nouveauté') {
      filtered = filtered.filter((p) => isNewProduct(p));
    } else if (activeTab === 'Produits phares') {
      // Pour les produits phares, on peut utiliser une logique basée sur la popularité
      // Ici, on considère les produits les plus récents comme "phares"
      // Vous pouvez adapter cette logique selon vos besoins
      filtered = filtered.filter((p) => {
        // Par exemple, les produits créés récemment ou avec des prix moyens/élevés
        return isNewProduct(p) || (p.minPriceCents && p.minPriceCents > 5000);
      });
    }

    // Appliquer le tri
    switch (sortBy) {
      case 'relevance':
        // Tri par pertinence : en stock d'abord, puis avec vraie image
        filtered.sort((a, b) => {
          const aInStock = isInStock(a);
          const bInStock = isInStock(b);
          const aHasImage = hasRealImage(a);
          const bHasImage = hasRealImage(b);

          // Priorité 1 : En stock vs non en stock
          if (aInStock !== bInStock) {
            return aInStock ? -1 : 1; // En stock en premier
          }

          // Priorité 2 : Avec vraie image vs sans vraie image
          if (aHasImage !== bHasImage) {
            return aHasImage ? -1 : 1; // Avec image en premier
          }

          // Si même niveau de pertinence, trier par date (plus récent en premier)
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        });
        break;
      case 'price-asc':
        filtered.sort((a, b) => (a.minPriceCents || 0) - (b.minPriceCents || 0));
        break;
      case 'price-desc':
        filtered.sort((a, b) => (b.minPriceCents || 0) - (a.minPriceCents || 0));
        break;
      case 'newest':
        filtered.sort(
          (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
        break;
      case 'popular':
      default:
        // Tri par défaut : pertinence
        filtered.sort((a, b) => {
          const aInStock = isInStock(a);
          const bInStock = isInStock(b);
          const aHasImage = hasRealImage(a);
          const bHasImage = hasRealImage(b);

          if (aInStock !== bInStock) {
            return aInStock ? -1 : 1;
          }

          if (aHasImage !== bHasImage) {
            return aHasImage ? -1 : 1;
          }

          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        });
        break;
    }

    return filtered;
  }, [
    allProducts,
    selectedGameCategories,
    selectedProductTypes,
    selectedAvailability,
    selectedPriceRange.min,
    selectedPriceRange.max,
    selectedLanguages,
    sortBy,
    catalogSearchQuery,
    activeTab,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, page, productsPerPage]);

  // Charger les produits au montage (chargement initial uniquement)
  useEffect(() => {
    loadAllProducts();
  }, []);

  // Nettoyer le paramètre 'search' de l'URL si présent (pour éviter la synchronisation avec la navbar)
  // Ceci est fait une seule fois au montage pour dé-synchroniser immédiatement les deux barres
  useEffect(() => {
    // Si on arrive avec ?search=... depuis la navbar, on garde la valeur dans catalogSearchQuery
    // mais on supprime le paramètre de l'URL pour éviter toute synchronisation future
    if (searchParams.has('search')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Exécuté une seule fois au montage

  // Réinitialiser la page quand les filtres, le tri ou la recherche changent
  useEffect(() => {
    setPage(1);
  }, [
    selectedGameCategories,
    selectedProductTypes,
    selectedAvailability,
    selectedPriceRange,
    selectedLanguages,
    sortBy,
    catalogSearchQuery,
    activeTab,
  ]);

  async function loadAllProducts() {
    setLoading(true);
    setError(null);
    try {
      const response = (await listProducts({
        limit: 500, // Augmenter pour avoir tous les produits disponibles
      })) as {
        products: ProductType[];
        pagination: { page: number; total: number; pages: number };
      };

      if (!response || !response.products) {
        setError('Impossible de charger les produits. Veuillez réessayer plus tard.');
        setAllProducts([]);
        return;
      }

      const filteredProducts = response.products.filter((p) => p.category !== 'Accessoires');

      setAllProducts(filteredProducts);
    } catch {
      setError('Erreur lors du chargement des produits. Veuillez réessayer.');
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // Gestion de la recherche du catalogue : état local indépendant (ne modifie pas l'URL)
  const handleCatalogSearchChange = (query: string) => {
    // Mise à jour uniquement de l'état local, pas de l'URL
    // Cela garantit que la navbar n'est pas affectée
    setCatalogSearchQuery(query);

    // Si la navbar avait mis un paramètre search dans l'URL, on le supprime
    // pour éviter toute confusion, mais sans affecter la navbar elle-même
    if (searchParams.has('search')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      // Utiliser replace: true pour ne pas créer d'entrée dans l'historique
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleGameCategoriesChange = (categories: GameCategory[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (categories.length > 0) {
      newParams.set('categories', categoriesToString(categories));
    } else {
      newParams.delete('categories');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleProductTypesChange = (types: ProductTypeEnum[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (types.length > 0) {
      newParams.set('types', typesToString(types));
    } else {
      newParams.delete('types');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleAvailabilityChange = (availability: Availability[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (availability.length > 0) {
      newParams.set('availability', availabilityToString(availability));
    } else {
      newParams.delete('availability');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handlePriceRangeChange = (range: { min: number | null; max: number | null }) => {
    const newParams = new URLSearchParams(searchParams);
    if (range.min !== null || range.max !== null) {
      newParams.set('price', priceRangeToString(range.min, range.max));
    } else {
      newParams.delete('price');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleLanguagesChange = (languages: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (languages.length > 0) {
      newParams.set('languages', languagesToString(languages));
    } else {
      newParams.delete('languages');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleResetFilters = () => {
    // Réinitialiser l'état local de recherche du catalogue
    setCatalogSearchQuery('');

    const newParams = new URLSearchParams(searchParams);
    // Garder seulement le tri et les onglets
    // Supprimer search de l'URL si présent (mais sans affecter la navbar)
    newParams.delete('search');
    newParams.delete('categories');
    newParams.delete('types');
    newParams.delete('availability');
    newParams.delete('price');
    newParams.delete('languages');
    setSearchParams(newParams, { replace: true });
    setActiveTab('Tous');
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* En-tête */}
        <div className={styles.header}>
          <h1 className={styles.title}>Boutique</h1>
          <div className={styles.divider}></div>
        </div>

        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: 'Accueil', path: '/' }, { label: 'Boutique' }]} />

        {/* Zone de filtre */}
        {!loading && !error && (
          <FilterBar
            searchQuery={catalogSearchQuery}
            onSearchChange={handleCatalogSearchChange}
            selectedGameCategories={selectedGameCategories}
            onGameCategoriesChange={handleGameCategoriesChange}
            selectedProductTypes={selectedProductTypes}
            onProductTypesChange={handleProductTypesChange}
            selectedAvailability={selectedAvailability}
            onAvailabilityChange={handleAvailabilityChange}
            selectedPriceRange={selectedPriceRange}
            onPriceRangeChange={handlePriceRangeChange}
            selectedLanguages={selectedLanguages}
            onLanguagesChange={handleLanguagesChange}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onResetFilters={handleResetFilters}
          />
        )}

        {/* Contenu principal */}
        <div className={styles.content}>
          {/* Grille de produits */}
          <main className={styles.main}>
            {loading ? (
              <div className={styles.loading}>Chargement des produits...</div>
            ) : error ? (
              <div className={styles.errorState}>
                <p>{error}</p>
                <button onClick={loadAllProducts} className={styles.retryButton}>
                  Réessayer
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>
                  {catalogSearchQuery ||
                  selectedGameCategories.length > 0 ||
                  selectedProductTypes.length > 0 ||
                  selectedAvailability.length > 0
                    ? 'Aucun produit ne correspond à ces critères. Essayez de modifier vos filtres.'
                    : 'Aucun produit disponible pour le moment.'}
                </p>
                {(catalogSearchQuery ||
                  selectedGameCategories.length > 0 ||
                  selectedProductTypes.length > 0 ||
                  selectedAvailability.length > 0) && (
                  <button onClick={handleResetFilters} className={styles.clearSearchButton}>
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <ProductGrid
                products={paginatedProducts}
                onPageChange={setPage}
                currentPage={page}
                totalPages={totalPages}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
