import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import styles from './AdminProductsPage.module.css';

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  variants: any[];
  images: any[];
  _count?: {
    reviews: number;
  };
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err: any) {
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setProducts(products.filter(p => p.id !== productId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Chargement...</div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      <div className={styles.header}>
        <div>
          <h1>Produits</h1>
          <p>{products.length} produit{products.length > 1 ? 's' : ''} au total</p>
        </div>
        <button
          onClick={() => navigate('/admin/products/new')}
          className={styles.addButton}
        >
          <Plus size={20} />
          Nouveau produit
        </button>
      </div>

      <div className={styles.searchBox}>
        <Search size={20} />
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <Package size={48} />
          <p>Aucun produit trouvé</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Variantes</th>
                <th>Stock total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                return (
                  <tr key={product.id}>
                    <td>
                      <div className={styles.productInfo}>
                        {product.images[0] && (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className={styles.productImage}
                          />
                        )}
                        <div>
                          <p className={styles.productName}>{product.name}</p>
                          <p className={styles.productSlug}>{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>{product.variants.length}</td>
                    <td>
                      <span className={totalStock === 0 ? styles.outOfStock : ''}>
                        {totalStock}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                          className={styles.editButton}
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className={styles.deleteButton}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
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

