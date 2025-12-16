import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import styles from './AdminInventoryPage.module.css';

// Icônes SVG
const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const PackageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

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
        headers: { 'Authorization': `Bearer ${token}` }
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

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement de l'inventaire...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      {/* Header Stats */}
      {stats && (
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Variantes</span>
          </div>
          <div className={`${styles.statItem} ${styles.warning}`}>
            <span className={styles.statValue}>{stats.lowStock}</span>
            <span className={styles.statLabel}>Stock faible</span>
          </div>
          <div className={`${styles.statItem} ${styles.danger}`}>
            <span className={styles.statValue}>{stats.outOfStock}</span>
            <span className={styles.statLabel}>Épuisés</span>
          </div>
        </div>
      )}

      {/* Alert */}
      {lowStockVariants.length > 0 && (
        <div className={styles.alert}>
          <AlertIcon />
          <span>
            <strong>{lowStockVariants.length}</strong> produit{lowStockVariants.length > 1 ? 's' : ''} avec stock faible nécessite{lowStockVariants.length > 1 ? 'nt' : ''} votre attention
          </span>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableContainer}>
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
            {variants.map((variant) => {
              const isLow = variant.stock > 0 && variant.stock <= 10;
              const isOut = variant.stock === 0;

              return (
                <tr key={variant.id} className={isLow || isOut ? styles.alertRow : ''}>
                  <td>
                    <div className={styles.productCell}>
                      {variant.product.images[0] ? (
                        <img
                          src={variant.product.images[0].url}
                          alt={variant.product.name}
                          className={styles.productImage}
                        />
                      ) : (
                        <div className={styles.productImagePlaceholder}>
                          <PackageIcon />
                        </div>
                      )}
                      <span className={styles.productName}>{variant.product.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.variantName}>{variant.name}</span>
                  </td>
                  <td>
                    <span className={`${styles.stockBadge} ${isOut ? styles.out : isLow ? styles.low : ''}`}>
                      {variant.stock}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        const newStock = prompt('Nouveau stock:', variant.stock.toString());
                        if (newStock !== null && !isNaN(parseInt(newStock))) {
                          updateStock(variant.id, parseInt(newStock));
                        }
                      }}
                      className={styles.editButton}
                      title="Modifier le stock"
                    >
                      <EditIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
