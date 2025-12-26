import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import styles from './AdminProductsPage.module.css';

// Icônes SVG
const PlusIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const EditIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PackageIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  variants: any[];
  images: any[];
  _count?: { reviews: number };
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadProducts();
  }, [user, authLoading]);

  async function loadProducts() {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err: Error) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(productId: string) {
    if (!token || !confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');
      setProducts(products.filter((p) => p.id !== productId));
    } catch (err: Error) {
      alert(err.message);
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement des produits...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <p className={styles.pageCount}>
            {products.length} produit{products.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button onClick={() => navigate('/admin/products/new')} className={styles.addButton}>
          <PlusIcon />
          <span>Nouveau produit</span>
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Rechercher un produit par nom ou catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <PackageIcon />
          <h3>Aucun produit trouvé</h3>
          <p>Essayez de modifier votre recherche ou créez un nouveau produit.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Variantes</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                const isLowStock = totalStock > 0 && totalStock <= 5;
                const isOutOfStock = totalStock === 0;

                return (
                  <tr key={product.id}>
                    <td>
                      <div className={styles.productCell}>
                        {product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className={styles.productImage}
                          />
                        ) : (
                          <div className={styles.productImagePlaceholder}>
                            <PackageIcon />
                          </div>
                        )}
                        <div className={styles.productInfo}>
                          <span className={styles.productName}>{product.name}</span>
                          <span className={styles.productSlug}>{product.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>{product.category}</span>
                    </td>
                    <td>
                      <span className={styles.variantCount}>{product.variants.length}</span>
                    </td>
                    <td>
                      <span
                        className={`${styles.stockBadge} ${isOutOfStock ? styles.outOfStock : isLowStock ? styles.lowStock : ''}`}
                      >
                        {totalStock}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                          className={styles.actionButton}
                          title="Modifier"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className={`${styles.actionButton} ${styles.danger}`}
                          title="Supprimer"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
