import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductsPage.module.css';
import { listProducts } from './api';
import type { Product as ProductType } from './cartContext';

export function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = ['Tous', 'Pokémon', 'One Piece', 'Accessoires'];

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, search, page]);

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await listProducts({
        page,
        limit: 12,
        category: selectedCategory === 'Tous' ? undefined : selectedCategory,
        search: search || undefined
      }) as { products: ProductType[]; pagination: { page: number; total: number; pages: number } };
      
      console.log('📦 Produits chargés:', response.products.length);
      console.log('📊 Pagination:', response.pagination);
      console.log('🔍 Catégorie sélectionnée:', selectedCategory);
      console.log('🔎 Recherche:', search || 'aucune');
      response.products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (${p.category}) - slug="${p.slug}" - ${p.variants.length} variant(s) - prix min: ${p.minPriceCents !== null ? p.minPriceCents + ' centimes' : 'null'}`);
      });
      
      setProducts(response.products);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const getCategoryColor = (categoryName: string) => {
    // Tout en bleu pour la cohérence avec la DA du site
    return '#06b6d4';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Boutique</h1>
        <p className={styles.subtitle}>
          Découvrez notre collection de produits : cartes, displays, accessoires et plus encore
        </p>
        {!loading && products.length > 0 && (
          <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            {products.length} produit{products.length > 1 ? 's' : ''} affiché{products.length > 1 ? 's' : ''}
            {totalPages > 1 && ` (Page ${page} sur ${totalPages})`}
          </p>
        )}
      </div>

      {search && (
        <div style={{
          padding: '1rem',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#e2e8f0' }}>
            🔍 Recherche active: "<strong>{search}</strong>" - {products.length} résultat{products.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              console.log('🗑️ Effacement de la recherche depuis le message');
              setSearch('');
              setPage(1);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Effacer la recherche
          </button>
        </div>
      )}
      <div className={styles.controls}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Catégorie :</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className={styles.filterSelect}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Recherche :</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                const newSearch = e.target.value;
                console.log('🔍 Nouvelle recherche:', newSearch);
                setSearch(newSearch);
                setPage(1);
              }}
              placeholder="Rechercher un produit..."
              className={styles.searchInput}
            />
            {search && (
              <button
                onClick={() => {
                  console.log('🗑️ Effacement de la recherche');
                  setSearch('');
                  setPage(1);
                }}
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Chargement des produits...</div>
      ) : (
        <>
          <div className={styles.productsGrid}>
            {products.length > 0 && console.log(`🎨 Rendu de ${products.length} produits dans la grille`)}
            {products.map((product, index) => {
              console.log(`🎨 Rendu produit ${index + 1}/${products.length}: ${product.name}`);
              return (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImage}>
                  {product.image ? (
                    <img src={product.image.url} alt={product.image.altText || product.name} />
                  ) : (
                    <div className={styles.placeholderImage}>Pas d'image</div>
                  )}
                  {product.outOfStock && (
                    <div className={styles.outOfStockBanner}>Rupture de stock</div>
                  )}
                </div>
                
                <div className={styles.productInfo}>
                  <div className={styles.categoryHeader}>
                    <span 
                      className={styles.categoryName}
                      style={{ color: getCategoryColor(product.category) }}
                    >
                      {product.category}
                    </span>
                  </div>
                  
                  <h3 className={styles.productName}>{product.name}</h3>
                  {product.description && (
                    <p className={styles.productDescription}>
                      {product.description.length > 100 
                        ? product.description.substring(0, 100) + '...' 
                        : product.description}
                    </p>
                  )}
                  
                  <div className={styles.priceContainer}>
                    {product.minPriceCents !== null && (
                      <span className={styles.price}>
                        À partir de {formatPrice(product.minPriceCents)}€
                      </span>
                    )}
                  </div>
                  
                  <button 
                    className={styles.viewProductButton}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🖱️ Clic sur produit:', product.name, 'slug:', product.slug);
                      if (product.slug) {
                        console.log('✅ Navigation vers:', `/produit/${product.slug}`);
                        navigate(`/produit/${product.slug}`);
                      } else {
                        console.error('❌ Produit sans slug:', product);
                        alert('Ce produit n\'a pas de slug. Veuillez contacter le support.');
                      }
                    }}
                    disabled={product.outOfStock || !product.slug}
                  >
                    {product.outOfStock ? 'Rupture de stock' : 'Voir le produit'}
                  </button>
                </div>
              </div>
            );
            })}
          </div>

          {products.length === 0 && !loading && (
            <div className={styles.noProducts}>
              <p>Aucun produit trouvé avec ces critères.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={styles.pageButton}
              >
                Précédent
              </button>
              <span className={styles.pageInfo}>
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={styles.pageButton}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
