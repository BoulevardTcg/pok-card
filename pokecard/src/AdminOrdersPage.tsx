import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { API_BASE } from './api';
import { AdminLayout } from './components/admin/AdminLayout';
import styles from './AdminOrdersPage.module.css';
import { Package, Truck, CheckCircle, XCircle, Clock, Search, Filter, RefreshCw, ChevronDown } from 'lucide-react';

interface OrderItem {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  totalPriceCents: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  totalCents: number;
  currency: string;
  items: OrderItem[];
  createdAt: string;
  user?: {
    id: string;
    email: string;
    username?: string;
  };
}

const statusConfig = {
  PENDING: { label: 'En attente', icon: Clock, color: '#f59e0b' },
  CONFIRMED: { label: 'Confirmée', icon: CheckCircle, color: '#3b82f6' },
  SHIPPED: { label: 'Expédiée', icon: Truck, color: '#8b5cf6' },
  DELIVERED: { label: 'Livrée', icon: Package, color: '#10b981' },
  CANCELLED: { label: 'Annulée', icon: XCircle, color: '#ef4444' },
  REFUNDED: { label: 'Remboursée', icon: XCircle, color: '#6b7280' }
};

const allStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function loadOrders() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Accès non autorisé');
        }
        throw new Error('Erreur lors du chargement des commandes');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    if (!token) return;

    try {
      setUpdatingOrderId(orderId);

      const response = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }

      // Mettre à jour la liste localement
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus as Order['status'] } : order
      ));
    } catch (err: any) {
      console.error('Erreur:', err);
      alert(err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrer les commandes
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Chargement des commandes...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Gestion des commandes</h1>
            <p className={styles.subtitle}>{orders.length} commandes au total</p>
          </div>
          <button onClick={loadOrders} className={styles.refreshButton}>
            <RefreshCw size={18} />
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher par n° de commande ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterBox}>
            <Filter size={18} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Tous les statuts</option>
              {allStatuses.map(status => (
                <option key={status} value={status}>
                  {statusConfig[status].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={loadOrders} className={styles.retryButton}>
              Réessayer
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className={styles.empty}>
            <Package size={48} />
            <p>Aucune commande trouvée</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Articles</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const StatusIcon = statusConfig[order.status].icon;
                  return (
                    <tr key={order.id}>
                      <td>
                        <span className={styles.orderNumber}>{order.orderNumber}</span>
                      </td>
                      <td>
                        <div className={styles.clientInfo}>
                          <span className={styles.clientEmail}>{order.user?.email || 'Invité'}</span>
                          {order.user?.username && (
                            <span className={styles.clientName}>@{order.user.username}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={styles.itemsCount}>
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} article(s)
                        </span>
                      </td>
                      <td>
                        <span className={styles.total}>{formatPrice(order.totalCents)}€</span>
                      </td>
                      <td>
                        <span className={styles.date}>{formatDate(order.createdAt)}</span>
                      </td>
                      <td>
                        <div 
                          className={styles.statusBadge}
                          style={{ color: statusConfig[order.status].color }}
                        >
                          <StatusIcon size={14} />
                          {statusConfig[order.status].label}
                        </div>
                      </td>
                      <td>
                        <div className={styles.statusSelect}>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            disabled={updatingOrderId === order.id}
                            className={styles.statusDropdown}
                          >
                            {allStatuses.map(status => (
                              <option key={status} value={status}>
                                {statusConfig[status].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className={styles.dropdownIcon} />
                          {updatingOrderId === order.id && (
                            <div className={styles.updateSpinner}></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

