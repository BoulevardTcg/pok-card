import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { API_BASE } from './api';
import { AdminLayout } from './components/admin/AdminLayout';
import styles from './AdminOrdersPage.module.css';

// Icônes SVG
const PackageIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

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
  user?: { id: string; email: string; username?: string };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'warning' },
  CONFIRMED: { label: 'Confirmée', className: 'info' },
  SHIPPED: { label: 'Expédiée', className: 'info' },
  DELIVERED: { label: 'Livrée', className: 'success' },
  CANCELLED: { label: 'Annulée', className: 'error' },
  REFUNDED: { label: 'Remboursée', className: 'neutral' }
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
  }, [user, authLoading]);

  async function loadOrders() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 403) throw new Error('Accès non autorisé');
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

      if (!response.ok) throw new Error('Erreur lors de la mise à jour du statut');

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

  const formatPrice = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <div className={styles.spinner} />
          <p>Chargement des commandes...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <p className={styles.pageCount}>{orders.length} commande{orders.length > 1 ? 's' : ''} au total</p>
        <button onClick={loadOrders} className={styles.refreshButton}>
          <RefreshIcon />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.searchInput}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Rechercher par n° de commande ou client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filterSelect}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            {allStatuses.map(status => (
              <option key={status} value={status}>{statusConfig[status].label}</option>
            ))}
          </select>
          <ChevronDownIcon />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadOrders} className={styles.retryButton}>Réessayer</button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          <PackageIcon />
          <h3>Aucune commande trouvée</h3>
          <p>Essayez de modifier vos filtres de recherche.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
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
                const status = statusConfig[order.status];
                return (
                  <tr key={order.id}>
                    <td>
                      <span className={styles.orderNumber}>{order.orderNumber}</span>
                    </td>
                    <td>
                      <div className={styles.clientCell}>
                        <span className={styles.clientEmail}>{order.user?.email || 'Invité'}</span>
                        {order.user?.username && (
                          <span className={styles.clientUsername}>@{order.user.username}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={styles.itemsCount}>
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.total}>{formatPrice(order.totalCents)}€</span>
                    </td>
                    <td>
                      <span className={styles.date}>{formatDate(order.createdAt)}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[status.className]}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div className={styles.statusSelectWrapper}>
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          disabled={updatingOrderId === order.id}
                          className={styles.statusDropdown}
                        >
                          {allStatuses.map(s => (
                            <option key={s} value={s}>{statusConfig[s].label}</option>
                          ))}
                        </select>
                        {updatingOrderId === order.id && (
                          <div className={styles.updateSpinner} />
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
    </AdminLayout>
  );
}
