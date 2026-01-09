import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './ProductsPage.module.css';
import { listProducts } from './api';
import type { Product as ProductType } from './cartContext';
import FilterSidebar from './components/catalogue/FilterSidebar';
import ProductGrid from './components/catalogue/ProductGrid';

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [page, setPage] = useState(1);
  const productsPerPage = 12;
  const sortBy = searchParams.get('sort') || 'newest';
  const searchQuery = searchParams.get('search') || '';

  // Filtrer et trier les produits selon les critères
  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Filtre par catégorie
    if (selectedCategory !== 'Toutes') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filtre par prix
    if (selectedPriceRange !== 'all') {
      filtered = filtered.filter((p) => {
        if (p.minPriceCents === null) return false;
        const price = p.minPriceCents / 100;
        switch (selectedPriceRange) {
          case '0-50':
            return price < 50;
          case '50-100':
            return price >= 50 && price < 100;
          case '100-500':
            return price >= 100 && price < 500;
          case '500+':
            return price >= 500;
          default:
            return true;
        }
      });
    }

    // Appliquer le tri
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => (a.minPriceCents || 0) - (b.minPriceCents || 0));
        break;
      case 'price-desc':
        filtered.sort((a, b) => (b.minPriceCents || 0) - (a.minPriceCents || 0));
        break;
      case 'newest':
      default:
        filtered.sort(
          (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
        break;
    }

    return filtered;
  }, [allProducts, selectedCategory, selectedPriceRange, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, page, productsPerPage]);

  // Charger les produits au montage et quand la catégorie ou la recherche change
  useEffect(() => {
    loadAllProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery]);

  // Réinitialiser la page quand les filtres, le tri ou la recherche changent
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedPriceRange, sortBy, searchQuery]);

  async function loadAllProducts() {
    setLoading(true);
    setError(null);
    try {
      const response = (await listProducts({
        limit: 200,
        category: selectedCategory === 'Toutes' ? undefined : selectedCategory,
        search: searchQuery || undefined,
      })) as {
        products: ProductType[];
        pagination: { page: number; total: number; pages: number };
      };

      console.log('📦 Produits reçus:', response.products?.length || 0);

      if (!response || !response.products) {
        console.error("❌ Réponse invalide de l'API:", response);
        setError('Impossible de charger les produits. Veuillez réessayer plus tard.');
        setAllProducts([]);
        return;
      }

      // Filtrer pour exclure les produits de la catégorie "Accessoires"
      let filteredProducts = response.products.filter((p) => p.category !== 'Accessoires');

      console.log('✅ Produits filtrés:', filteredProducts.length);

      // Si une catégorie spécifique est sélectionnée, ne pas mélanger pour garder l'ordre
      if (selectedCategory === 'Toutes') {
        // Mélanger les produits seulement si toutes les catégories sont affichées
        filteredProducts = [...filteredProducts].sort(() => Math.random() - 0.5);
      }

      setAllProducts(filteredProducts);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des produits:', error);
      setError('Erreur lors du chargement des produits. Veuillez réessayer.');
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const handleReset = () => {
    setSelectedCategory('Toutes');
    setSelectedPriceRange('all');
    setPage(1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* En-tête */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            {searchQuery ? `Résultats pour "${searchQuery}"` : 'Catalogue'}
          </h1>
          <div className={styles.divider}></div>
          <p className={styles.subtitle}>
            {searchQuery
              ? `${allProducts.length} produit${allProducts.length > 1 ? 's' : ''} trouvé${allProducts.length > 1 ? 's' : ''}`
              : 'Explorez notre sélection premium de cartes TCG, soigneusement sélectionnées pour leur qualité et leur rareté.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSelectedCategory('Toutes');
                setSelectedPriceRange('all');
                navigate('/produits');
              }}
              className={styles.clearSearchButton}
            >
              Effacer la recherche
            </button>
          )}
        </div>

        {/* Contenu principal */}
        <div className={styles.content}>
          {/* Sidebar filtres */}
          <aside className={styles.sidebar}>
            <FilterSidebar
              filters={{
                category: selectedCategory,
                priceRange: selectedPriceRange,
                condition: 'Toutes', // Pas de filtre condition implémenté pour l'instant
              }}
              callbacks={{
                onCategoryChange: setSelectedCategory,
                onPriceRangeChange: setSelectedPriceRange,
                onConditionChange: () => {}, // Pas de filtre condition implémenté
                onReset: handleReset,
              }}
            />
          </aside>

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
            ) : allProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>
                  {searchQuery
                    ? `Aucun produit trouvé pour "${searchQuery}". Essayez avec d'autres mots-clés.`
                    : 'Aucun produit disponible pour le moment.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSelectedCategory('Toutes');
                      setSelectedPriceRange('all');
                      navigate('/produits');
                    }}
                    className={styles.clearSearchButton}
                  >
                    Voir tous les produits
                  </button>
                )}
              </div>
            ) : (
              <ProductGrid
                products={paginatedProducts}
                onPageChange={setPage}
                currentPage={page}
                totalPages={totalPages}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
