import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductsPage.module.css';
import { listProducts, getImageUrl } from './api';
import type { Product as ProductType } from './cartContext';

export function ProtectionsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadProducts();
  }, [search, page]);

  async function loadProducts() {
    setLoading(true);
    try {
      const response = (await listProducts({
        page,
        limit: 12,
        category: 'Accessoires', // Filtrer uniquement les accessoires/protections
        search: search || undefined,
      })) as {
        products: ProductType[];
        pagination: { page: number; total: number; pages: number };
      };

      setProducts(response.products);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Erreur lors du chargement des protections:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (cents: number | null) => {
    if (cents === null) return 'Prix sur demande';
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Protections</h1>
        <p className={styles.subtitle}>
          Protégez vos cartes et items avec notre sélection de protections premium : sleeves, étuis,
          binders et plus encore
        </p>
        {!loading && products.length > 0 && (
          <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            {products.length} produit{products.length > 1 ? 's' : ''} affiché
            {products.length > 1 ? 's' : ''}
            {totalPages > 1 && ` (Page ${page} sur ${totalPages})`}
          </p>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Recherche :</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher une protection..."
              className={styles.searchInput}
            />
            {search && (
              <button
                onClick={() => {
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
                  cursor: 'pointer',
                }}
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {search && (
        <div
          style={{
            padding: '1rem',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#e2e8f0' }}>
            🔍 Recherche active: "<strong>{search}</strong>" - {products.length} résultat
            {products.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              setSearch('');
              setPage(1);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Effacer la recherche
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Chargement des protections...</div>
      ) : (
        <>
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImage}>
                  {product.image ? (
                    <img
                      src={getImageUrl(product.image.url)}
                      alt={product.image.altText || product.name}
                    />
                  ) : (
                    <div className={styles.placeholderImage}>Pas d'image</div>
                  )}
                  {product.outOfStock && (
                    <div className={styles.outOfStockBanner}>Rupture de stock</div>
                  )}
                </div>

                <div className={styles.productInfo}>
                  <div className={styles.categoryHeader}>
                    <span className={styles.categoryName} style={{ color: '#06b6d4' }}>
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
                      if (product.slug) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        navigate(`/produit/${product.slug}`);
                      } else {
                        alert("Ce produit n'a pas de slug. Veuillez contacter le support.");
                      }
                    }}
                    disabled={product.outOfStock || !product.slug}
                  >
                    {product.outOfStock ? 'Rupture de stock' : 'Voir le produit'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && !loading && (
            <div className={styles.noProducts}>
              <p>Aucune protection trouvée avec ces critères.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={styles.pageButton}
              >
                Précédent
              </button>
              <span className={styles.pageInfo}>
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
