import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Boxes
} from 'lucide-react';
import styles from './AdminDashboard.module.css';

interface DashboardStats {
  orders: {
    total: number;
    pending: number;
  };
  users: {
    total: number;
  };
  products: {
    total: number;
    lowStock: number;
  };
  revenue: {
    total: number;
  };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  totalCents: number;
  status: string;
  createdAt: string;
  user?: {
    email: string;
    username?: string;
  };
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

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadDashboard();
  }, [user, authLoading]);

  async function loadDashboard() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Charger le dashboard et les produits en parallèle
      const [dashboardRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/admin/products?limit=500`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!dashboardRes.ok) {
        throw new Error('Erreur lors du chargement du dashboard');
      }

      const dashboardData = await dashboardRes.json();
      setStats(dashboardData.stats);
      setRecentOrders(dashboardData.recentOrders || []);
      setTopProducts(dashboardData.topProducts || []);

      // Calculer le stock total
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const stock = (productsData.products || []).reduce((total: number, product: any) => {
          return total + (product.variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        }, 0);
        setTotalStock(stock);
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement du dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      {error ? (
        <div className={styles.error}>
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
              <div className={styles.statIcon} style={{ background: '#3b82f6' }}>
                <ShoppingCart size={24} />
              </div>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Commandes</h3>
                <p className={styles.statValue}>{stats?.orders.total || 0}</p>
                {stats && stats.orders.pending > 0 && (
                  <span className={styles.statBadge}>
                    {stats.orders.pending} en attente
                  </span>
                )}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#10b981' }}>
                <Users size={24} />
              </div>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Utilisateurs</h3>
                <p className={styles.statValue}>{stats?.users.total || 0}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#8b5cf6' }}>
                <Package size={24} />
              </div>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Produits</h3>
                <p className={styles.statValue}>{stats?.products.total || 0}</p>
                {stats && stats.products.lowStock > 0 && (
                  <span className={styles.statBadge} style={{ background: '#ef4444' }}>
                    {stats.products.lowStock} stock faible
                  </span>
                )}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#f59e0b' }}>
                <DollarSign size={24} />
              </div>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Revenus</h3>
                <p className={styles.statValue}>
                  {formatPrice(stats?.revenue.total || 0)}€
                </p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#06b6d4' }}>
                <Boxes size={24} />
              </div>
              <div className={styles.statContent}>
                <h3 className={styles.statLabel}>Stock Total</h3>
                <p className={styles.statValue}>{totalStock}</p>
                {stats && stats.products.lowStock > 0 && (
                  <span className={styles.statBadge} style={{ background: '#ef4444' }}>
                    {stats.products.lowStock} en alerte
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Alerts */}
          {stats && (stats.orders.pending > 0 || stats.products.lowStock > 0) && (
            <div className={styles.alerts}>
              {stats.orders.pending > 0 && (
                <div className={styles.alert}>
                  <AlertTriangle size={20} />
                  <span>
                    {stats.orders.pending} commande{stats.orders.pending > 1 ? 's' : ''} en attente
                  </span>
                  <button
                    onClick={() => navigate('/admin/orders')}
                    className={styles.alertButton}
                  >
                    Voir <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {stats.products.lowStock > 0 && (
                <div className={styles.alert}>
                  <AlertTriangle size={20} />
                  <span>
                    {stats.products.lowStock} produit{stats.products.lowStock > 1 ? 's' : ''} avec stock faible
                  </span>
                  <button
                    onClick={() => navigate('/admin/inventory')}
                    className={styles.alertButton}
                  >
                    Voir <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recent Orders & Top Products */}
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Commandes récentes</h2>
                <button
                  onClick={() => navigate('/admin/orders')}
                  className={styles.viewAllButton}
                >
                  Voir tout <ArrowRight size={16} />
                </button>
              </div>
              <div className={styles.cardContent}>
                {recentOrders.length === 0 ? (
                  <p className={styles.empty}>Aucune commande récente</p>
                ) : (
                  <div className={styles.ordersList}>
                    {recentOrders.map((order) => (
                      <div key={order.id} className={styles.orderItem}>
                        <div>
                          <p className={styles.orderNumber}>{order.orderNumber}</p>
                          <p className={styles.orderUser}>
                            {order.user?.email || 'Invité'}
                          </p>
                        </div>
                        <div className={styles.orderRight}>
                          <p className={styles.orderTotal}>
                            {formatPrice(order.totalCents)}€
                          </p>
                          <span className={styles.orderDate}>
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Produits les plus vendus</h2>
              </div>
              <div className={styles.cardContent}>
                {topProducts.length === 0 ? (
                  <p className={styles.empty}>Aucune donnée disponible</p>
                ) : (
                  <div className={styles.productsList}>
                    {topProducts.map((item, index) => (
                      <div key={item.product?.id || index} className={styles.productItem}>
                        <div>
                          <p className={styles.productName}>
                            {item.product?.name || 'Produit supprimé'}
                          </p>
                          <p className={styles.productSold}>
                            {item.totalSold} vendu{item.totalSold > 1 ? 's' : ''}
                          </p>
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

