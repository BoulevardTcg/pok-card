import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { API_BASE, getImageUrl } from './api';
import styles from './OrderDetailPage.module.css';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Calendar,
  Link as LinkIcon,
} from 'lucide-react';

interface OrderItem {
  id: string;
  productName: string;
  variantName?: string;
  imageUrl?: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
}

interface OrderEvent {
  id: string;
  type: string;
  message?: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  fulfillmentStatus?: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  totalCents: number;
  currency: string;
  paymentMethod?: string;
  items: OrderItem[];
  createdAt: string;
  shippingAddress?: {
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      postal_code?: string;
      country?: string;
    };
  };
  billingAddress?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      postal_code?: string;
      country?: string;
    };
  };
  events?: OrderEvent[];
}

const statusConfig = {
  PENDING: {
    label: 'En attente',
    icon: Clock,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  CONFIRMED: {
    label: 'Confirmée',
    icon: CheckCircle,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  SHIPPED: { label: 'Expédiée', icon: Truck, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  DELIVERED: {
    label: 'Livrée',
    icon: Package,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  CANCELLED: {
    label: 'Annulée',
    icon: XCircle,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
  REFUNDED: {
    label: 'Remboursée',
    icon: XCircle,
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
  },
};

const statusTimeline = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { token: authToken, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicToken = searchParams.get('token');

  useEffect(() => {
    if (!orderId) return;
    if (!publicToken && !authToken && !authLoading) {
      setError('Authentification ou lien de suivi requis');
      setLoading(false);
      return;
    }
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, publicToken, authToken, authLoading]);

  async function loadOrder() {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${API_BASE}/orders/${orderId}`);
      if (publicToken) url.searchParams.set('token', publicToken);

      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Commande non trouvée');
        if (response.status === 401) throw new Error('Lien de suivi invalide ou expiré');
        throw new Error('Erreur lors du chargement de la commande');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err: Error) {
      console.error(err);
      setError(err.message || 'Erreur lors du chargement de la commande');
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusIndex = (status: string) => statusTimeline.indexOf(status);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Chargement de la commande...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>
            <p>{error || 'Commande non trouvée'}</p>
            <button onClick={() => navigate('/')} className={styles.backButton}>
              <ArrowLeft size={18} />
              Retour à l’accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusConfig[order.status].icon;
  const currentStatusIndex = getStatusIndex(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => navigate('/')} className={styles.backButton}>
            <ArrowLeft size={18} />
            Retour
          </button>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.title}>Commande #{order.orderNumber}</h1>
              <p className={styles.orderDate}>
                <Calendar size={16} />
                Passée le {formatDate(order.createdAt)}
              </p>
            </div>
            <div
              className={styles.statusBadge}
              style={{
                color: statusConfig[order.status].color,
                backgroundColor: statusConfig[order.status].bgColor,
              }}
            >
              <StatusIcon size={18} />
              {statusConfig[order.status].label}
            </div>
          </div>
        </div>

        {!isCancelled && (
          <div className={styles.timeline}>
            <h2 className={styles.sectionTitle}>Suivi de commande</h2>
            <div className={styles.timelineTrack}>
              {statusTimeline.map((status, index) => {
                const isActive = index <= currentStatusIndex;
                const StatusStepIcon = statusConfig[status as keyof typeof statusConfig].icon;
                return (
                  <div key={status} className={styles.timelineStep}>
                    <div
                      className={`${styles.timelineIcon} ${isActive ? styles.active : ''}`}
                      style={
                        isActive
                          ? {
                              backgroundColor:
                                statusConfig[status as keyof typeof statusConfig].color,
                            }
                          : {}
                      }
                    >
                      <StatusStepIcon size={20} />
                    </div>
                    <span className={`${styles.timelineLabel} ${isActive ? styles.active : ''}`}>
                      {statusConfig[status as keyof typeof statusConfig].label}
                    </span>
                    {index < statusTimeline.length - 1 && (
                      <div
                        className={`${styles.timelineLine} ${index < currentStatusIndex ? styles.active : ''}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Informations de suivi</h2>
            <div className={styles.card}>
              <div className={styles.summaryLine}>
                <span>Transporteur</span>
                <span>{order.carrier || '—'}</span>
              </div>
              <div className={styles.summaryLine}>
                <span>Numéro de suivi</span>
                <span>{order.trackingNumber || '—'}</span>
              </div>
              {order.trackingUrl && (
                <a
                  className={styles.trackingButton}
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <LinkIcon size={16} />
                  Suivre mon colis
                </a>
              )}
            </div>

            {order.events && order.events.length > 0 && (
              <div className={styles.card} style={{ marginTop: 16 }}>
                <h3 className={styles.cardTitle}>Historique</h3>
                <div className={styles.timelineList}>
                  {order.events.map((event) => (
                    <div key={event.id} className={styles.timelineRow}>
                      <div className={styles.timelineDot} />
                      <div>
                        <div className={styles.timelineRowTitle}>{event.type}</div>
                        <div className={styles.timelineRowDate}>{formatDate(event.createdAt)}</div>
                        {event.message && (
                          <div className={styles.timelineRowMsg}>{event.message}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Articles commandés</h2>
            <div className={styles.itemsList}>
              {order.items.map((item) => (
                <div key={item.id} className={styles.item}>
                  {item.imageUrl ? (
                    <img
                      src={getImageUrl(item.imageUrl)}
                      alt={item.productName}
                      className={styles.itemImage}
                    />
                  ) : (
                    <div className={styles.placeholderImage}>📦</div>
                  )}
                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemName}>{item.productName}</h3>
                    {item.variantName && <p className={styles.itemVariant}>{item.variantName}</p>}
                    <p className={styles.itemQuantity}>Quantité: {item.quantity}</p>
                  </div>
                  <div className={styles.itemPrices}>
                    <span className={styles.unitPrice}>
                      {formatPrice(item.unitPriceCents)}€ / unité
                    </span>
                    <span className={styles.totalPrice}>{formatPrice(item.totalPriceCents)}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
