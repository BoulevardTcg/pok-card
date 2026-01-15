import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import styles from './AdminDashboard.module.css';

// Icônes SVG
const CartIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 6h15l-1.5 9h-12z" />
    <circle cx="9" cy="20" r="1" />
    <circle cx="18" cy="20" r="1" />
    <path d="M6 6L5 2H2" />
  </svg>
);

const UsersIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="17" cy="7" r="3" />
    <path d="M21 21v-2a3 3 0 0 0-2-2.83" />
  </svg>
);

const PackageIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const TrendingIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const BoxIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const AlertIcon = () => (
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
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

interface DashboardStats {
  orders: { total: number; pending: number };
  users: { total: number };
  products: { total: number; lowStock: number };
  revenue: { total: number };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  totalCents: number;
  status: string;
  createdAt: string;
  user?: { email: string; username?: string };
  items: any[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [totalStock, setTotalStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const [dashboardRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/admin/products?limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!dashboardRes.ok) {
        throw new Error('Erreur lors du chargement du dashboard');
      }

      const dashboardData = await dashboardRes.json();
      setStats(dashboardData.stats);
      setRecentOrders(dashboardData.recentOrders || []);
      setTopProducts(dashboardData.topProducts || []);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const stock = (productsData.products || []).reduce((total: number, product: any) => {
          return (
            total +
            (product.variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
          );
        }, 0);
        setTotalStock(stock);
      }
    } catch (err: Error) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, loadDashboard]);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'En attente', className: styles.badgeWarning },
      confirmed: { label: 'Confirmée', className: styles.badgeSuccess },
      shipped: { label: 'Expédiée', className: styles.badgeInfo },
      delivered: { label: 'Livrée', className: styles.badgeSuccess },
      cancelled: { label: 'Annulée', className: styles.badgeError },
    };
    return statusMap[status] || { label: status, className: styles.badgeNeutral };
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement du dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      {error ? (
        <div className={styles.error}>
          <AlertIcon />
          <p>{error}</p>
          <button onClick={loadDashboard} className={styles.retryButton}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIcon}>
                  <CartIcon />
                </div>
                {stats && stats.orders.pending > 0 && (
                  <span className={styles.statBadge}>{stats.orders.pending} en attente</span>
                )}
              </div>
              <div className={styles.statValue}>{stats?.orders.total || 0}</div>
              <div className={styles.statLabel}>Commandes totales</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIcon}>
                  <UsersIcon />
                </div>
              </div>
              <div className={styles.statValue}>{stats?.users.total || 0}</div>
              <div className={styles.statLabel}>Utilisateurs inscrits</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIcon}>
                  <PackageIcon />
                </div>
                {stats && stats.products.lowStock > 0 && (
                  <span className={`${styles.statBadge} ${styles.danger}`}>
                    {stats.products.lowStock} stock bas
                  </span>
                )}
              </div>
              <div className={styles.statValue}>{stats?.products.total || 0}</div>
              <div className={styles.statLabel}>Produits actifs</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIcon}>
                  <TrendingIcon />
                </div>
              </div>
              <div className={styles.statValue}>{formatPrice(stats?.revenue.total || 0)}€</div>
              <div className={styles.statLabel}>Revenus totaux</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.statIcon}>
                  <BoxIcon />
                </div>
              </div>
              <div className={styles.statValue}>{totalStock}</div>
              <div className={styles.statLabel}>Stock total</div>
            </div>
          </div>

          {/* Alerts */}
          {stats && (stats.orders.pending > 0 || stats.products.lowStock > 0) && (
            <div className={styles.alerts}>
              {stats.orders.pending > 0 && (
                <div className={styles.alert}>
                  <div className={styles.alertContent}>
                    <AlertIcon />
                    <span>
                      <strong>{stats.orders.pending}</strong> commande
                      {stats.orders.pending > 1 ? 's' : ''} en attente de traitement
                    </span>
                  </div>
                  <button onClick={() => navigate('/admin/orders')} className={styles.alertButton}>
                    Voir les commandes <ArrowRightIcon />
                  </button>
                </div>
              )}
              {stats.products.lowStock > 0 && (
                <div className={`${styles.alert} ${styles.alertDanger}`}>
                  <div className={styles.alertContent}>
                    <AlertIcon />
                    <span>
                      <strong>{stats.products.lowStock}</strong> produit
                      {stats.products.lowStock > 1 ? 's' : ''} avec stock faible
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/admin/inventory')}
                    className={styles.alertButton}
                  >
                    Gérer le stock <ArrowRightIcon />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Grid */}
          <div className={styles.contentGrid}>
            {/* Recent Orders */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Commandes récentes</h2>
                <button onClick={() => navigate('/admin/orders')} className={styles.viewAllButton}>
                  Tout voir <ArrowRightIcon />
                </button>
              </div>
              <div className={styles.cardContent}>
                {recentOrders.length === 0 ? (
                  <div className={styles.empty}>
                    <p>Aucune commande récente</p>
                  </div>
                ) : (
                  <div className={styles.ordersList}>
                    {recentOrders.slice(0, 5).map((order) => {
                      const status = getStatusBadge(order.status);
                      return (
                        <div key={order.id} className={styles.orderItem}>
                          <div className={styles.orderMain}>
                            <span className={styles.orderNumber}>{order.orderNumber}</span>
                            <span className={styles.orderEmail}>
                              {order.user?.email || 'Invité'}
                            </span>
                          </div>
                          <div className={styles.orderMeta}>
                            <span className={`${styles.badge} ${status.className}`}>
                              {status.label}
                            </span>
                            <span className={styles.orderTotal}>
                              {formatPrice(order.totalCents)}€
                            </span>
                            <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Meilleures ventes</h2>
              </div>
              <div className={styles.cardContent}>
                {topProducts.length === 0 ? (
                  <div className={styles.empty}>
                    <p>Aucune donnée disponible</p>
                  </div>
                ) : (
                  <div className={styles.productsList}>
                    {topProducts.slice(0, 5).map((item, index) => (
                      <div key={item.product?.id || index} className={styles.productItem}>
                        <div className={styles.productRank}>{index + 1}</div>
                        <div className={styles.productInfo}>
                          <span className={styles.productName}>
                            {item.product?.name || 'Produit supprimé'}
                          </span>
                          <span className={styles.productSold}>
                            {item.totalSold} vendu{item.totalSold > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className={styles.productBar}>
                          <div
                            className={styles.productBarFill}
                            style={{
                              width: `${(item.totalSold / (topProducts[0]?.totalSold || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
