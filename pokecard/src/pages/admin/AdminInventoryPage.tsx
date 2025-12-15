import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AlertTriangle, Package, Edit } from 'lucide-react';
import styles from './AdminInventoryPage.module.css';

interface Variant {
  id: string;
  name: string;
  stock: number;
  product: {
    id: string;
    name: string;
    slug: string;
    images: any[];
  };
}

export function AdminInventoryPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [lowStockVariants, setLowStockVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadInventory();
  }, [user, authLoading]);

  async function loadInventory() {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/inventory`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setVariants(data.variants || []);
      setLowStockVariants(data.lowStock || []);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }

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
          <h1>Gestion du stock</h1>
          {stats && (
            <p>
              {stats.total} variante{stats.total > 1 ? 's' : ''} • {stats.lowStock} stock faible • {stats.outOfStock} épuisé{stats.outOfStock > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {lowStockVariants.length > 0 && (
        <div className={styles.alert}>
          <AlertTriangle size={20} />
          <span>
            {lowStockVariants.length} produit{lowStockVariants.length > 1 ? 's' : ''} avec stock faible
          </span>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Variante</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id} className={variant.stock <= 10 ? styles.lowStock : ''}>
                <td>
                  <div className={styles.productInfo}>
                    {variant.product.images[0] && (
                      <img
                        src={variant.product.images[0].url}
                        alt={variant.product.name}
                        className={styles.productImage}
                      />
                    )}
                    <span>{variant.product.name}</span>
                  </div>
                </td>
                <td>{variant.name}</td>
                <td>
                  <span className={variant.stock === 0 ? styles.outOfStock : variant.stock <= 10 ? styles.lowStockText : ''}>
                    {variant.stock}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => {
                      const newStock = prompt('Nouveau stock:', variant.stock.toString());
                      if (newStock !== null) {
                        updateStock(variant.id, parseInt(newStock));
                      }
                    }}
                    className={styles.editButton}
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );

  async function updateStock(variantId: string, stock: number) {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/admin/inventory/${variantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stock, reason: 'Ajustement manuel' })
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');

      loadInventory();
    } catch (err: any) {
      alert(err.message);
    }
  }
}

