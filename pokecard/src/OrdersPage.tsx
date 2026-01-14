import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { API_BASE, getImageUrl } from './api';
import styles from './OrdersPage.module.css';
import { Package, Truck, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

interface OrderItem {
  id: string;
  productName: string;
  variantName?: string;
  imageUrl?: string;
  quantity: number;
  unitPriceCents: number;
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
  updatedAt: string;
  shippingAddress?: any;
}

const statusConfig = {
  PENDING: { label: 'En attente', icon: Clock, color: '#f59e0b' },
  CONFIRMED: { label: 'Confirmée', icon: CheckCircle, color: '#3b82f6' },
  SHIPPED: { label: 'Expédiée', icon: Truck, color: '#8b5cf6' },
  DELIVERED: { label: 'Livrée', icon: Package, color: '#10b981' },
  CANCELLED: { label: 'Annulée', icon: XCircle, color: '#ef4444' },
  REFUNDED: { label: 'Remboursée', icon: XCircle, color: '#6b7280' },
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Attendre que l'authentification soit vérifiée avant de charger les commandes
    if (authLoading) {
      return;
    }

    // La redirection sera gérée par ProtectedRoute, on charge juste les commandes si authentifié
    if (!isAuthenticated) {
      return;
    }

    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  async function loadOrders() {
    if (!token) {
      setError("Token d'authentification manquant");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/users/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err: Error) {
      setError(err.message || 'Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Chargement de vos commandes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={loadOrders} className={styles.retryButton}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Mes commandes</h1>
          <div className={styles.divider}></div>
          <p className={styles.description}>
            Consultez l'historique et le suivi de toutes vos commandes
          </p>
        </div>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <Package className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>Aucune commande</h2>
            <p className={styles.emptyText}>Vous n'avez pas encore passé de commande</p>
            <button onClick={() => navigate('/produits')} className={styles.shopButton}>
              Découvrir la boutique
            </button>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map((order) => {
              const StatusIcon = statusConfig[order.status].icon;
              const statusColor = statusConfig[order.status].color;

              return (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div className={styles.orderInfo}>
                      <h3 className={styles.orderNumber}>Commande #{order.orderNumber}</h3>
                      <p className={styles.orderDate}>Passée le {formatDate(order.createdAt)}</p>
                    </div>
                    <div className={styles.orderStatus} style={{ color: statusColor }}>
                      <StatusIcon className={styles.statusIcon} />
                      <span>{statusConfig[order.status].label}</span>
                    </div>
                  </div>

                  <div className={styles.orderItems}>
                    {order.items.map((item) => (
                      <div key={item.id} className={styles.orderItem}>
                        {item.imageUrl ? (
                          <img
                            src={getImageUrl(item.imageUrl)}
                            alt={item.productName}
                            className={styles.itemImage}
                          />
                        ) : (
                          <div className={styles.placeholderImage}>📦</div>
                        )}
                        <div className={styles.itemInfo}>
                          <h4 className={styles.itemName}>{item.productName}</h4>
                          {item.variantName && (
                            <p className={styles.itemVariant}>{item.variantName}</p>
                          )}
                          <p className={styles.itemQuantity}>Quantité: {item.quantity}</p>
                        </div>
                        <div className={styles.itemPrice}>{formatPrice(item.totalPriceCents)}€</div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.orderFooter}>
                    <div className={styles.orderTotal}>
                      <span className={styles.totalLabel}>Total:</span>
                      <span className={styles.totalAmount}>{formatPrice(order.totalCents)}€</span>
                    </div>
                    <button
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className={styles.viewButton}
                    >
                      <Eye className={styles.viewIcon} />
                      Voir les détails
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
