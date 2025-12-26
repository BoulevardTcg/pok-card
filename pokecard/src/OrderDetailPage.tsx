import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { API_BASE } from './api';
import styles from './OrderDetailPage.module.css';
import { Package, Truck, CheckCircle, XCircle, Clock, ArrowLeft, MapPin, CreditCard, Calendar, Link as LinkIcon } from 'lucide-react';

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
  fulfillmentStatus?: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  totalCents: number;
  currency: string;
  paymentMethod?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
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
}

const statusConfig = {
  PENDING: { label: 'En attente', icon: Clock, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  CONFIRMED: { label: 'Confirmée', icon: CheckCircle, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  SHIPPED: { label: 'Expédiée', icon: Truck, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  DELIVERED: { label: 'Livrée', icon: Package, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  CANCELLED: { label: 'Annulée', icon: XCircle, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  REFUNDED: { label: 'Remboursée', icon: XCircle, color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' }
};

const statusTimeline = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      navigate('/login');
      return;
    }
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, token, authLoading]);

  async function loadOrder() {
    if (!orderId || !token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/users/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Commande non trouvée');
        }
        throw new Error('Erreur lors du chargement de la commande');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err: Error) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur lors du chargement de la commande');
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIndex = (status: string) => {
    return statusTimeline.indexOf(status);
  };

  if (loading || authLoading) {
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
            <button onClick={() => navigate('/orders')} className={styles.backButton}>
              <ArrowLeft size={18} />
              Retour aux commandes
            </button>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusConfig[order.status].icon;
  const currentStatusIndex = getStatusIndex(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const isShipped = order.fulfillmentStatus === 'SHIPPED';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={() => navigate('/orders')} className={styles.backButton}>
            <ArrowLeft size={18} />
            Retour aux commandes
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
                backgroundColor: statusConfig[order.status].bgColor
              }}
            >
              <StatusIcon size={18} />
              {statusConfig[order.status].label}
            </div>
          </div>
        </div>

        {/* Timeline de suivi */}
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
                      style={isActive ? { backgroundColor: statusConfig[status as keyof typeof statusConfig].color } : {}}
                    >
                      <StatusStepIcon size={20} />
                    </div>
                    <span className={`${styles.timelineLabel} ${isActive ? styles.active : ''}`}>
                      {statusConfig[status as keyof typeof statusConfig].label}
                    </span>
                    {index < statusTimeline.length - 1 && (
                      <div className={`${styles.timelineLine} ${index < currentStatusIndex ? styles.active : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.content}>
          {/* Articles */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Articles commandés</h2>
            <div className={styles.itemsList}>
              {order.items.map((item) => (
                <div key={item.id} className={styles.item}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className={styles.itemImage} />
                  ) : (
                    <div className={styles.placeholderImage}>📦</div>
                  )}
                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemName}>{item.productName}</h3>
                    {item.variantName && (
                      <p className={styles.itemVariant}>{item.variantName}</p>
                    )}
                    <p className={styles.itemQuantity}>Quantité: {item.quantity}</p>
                  </div>
                  <div className={styles.itemPrices}>
                    <span className={styles.unitPrice}>{formatPrice(item.unitPriceCents)}€ / unité</span>
                    <span className={styles.totalPrice}>{formatPrice(item.totalPriceCents)}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Récapitulatif */}
            <div className={styles.summaryCard}>
              <h3 className={styles.cardTitle}>Récapitulatif</h3>
              <div className={styles.summaryLines}>
                <div className={styles.summaryLine}>
                  <span>Sous-total</span>
                  <span>{formatPrice(order.totalCents)}€</span>
                </div>
                <div className={styles.summaryLine}>
                  <span>Livraison</span>
                  <span>Gratuite</span>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.summaryTotal}>
                  <span>Total</span>
                  <span>{formatPrice(order.totalCents)}€</span>
                </div>
              </div>
            </div>

            {/* Suivi colis (si expédiée) */}
            {isShipped && (
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>
                  <Truck size={18} />
                  Suivi du colis
                </h3>
                <div className={styles.summaryLines}>
                  <div className={styles.summaryLine}>
                    <span>Transporteur</span>
                    <span>{order.carrier || '—'}</span>
                  </div>
                  <div className={styles.summaryLine}>
                    <span>Numéro de suivi</span>
                    <span>{order.trackingNumber || '—'}</span>
                  </div>
                </div>

                {order.trackingUrl ? (
                  <a className={styles.trackingButton} href={order.trackingUrl} target="_blank" rel="noreferrer">
                    <LinkIcon size={16} />
                    Suivre mon colis
                  </a>
                ) : (
                  <p className={styles.infoText} style={{ marginTop: 8 }}>
                    Le lien de suivi sera disponible sous peu.
                  </p>
                )}
              </div>
            )}

            {/* Paiement */}
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>
                <CreditCard size={18} />
                Paiement
              </h3>
              <p className={styles.infoText}>
                {order.paymentMethod === 'card' ? 'Carte bancaire' : order.paymentMethod || 'Carte bancaire'}
              </p>
              {order.billingAddress?.email && (
                <p className={styles.infoText}>{order.billingAddress.email}</p>
              )}
            </div>

            {/* Adresse de livraison */}
            {order.shippingAddress && (
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>
                  <MapPin size={18} />
                  Adresse de livraison
                </h3>
                {order.shippingAddress.name && (
                  <p className={styles.infoText}><strong>{order.shippingAddress.name}</strong></p>
                )}
                {order.shippingAddress.address && (
                  <>
                    {order.shippingAddress.address.line1 && (
                      <p className={styles.infoText}>{order.shippingAddress.address.line1}</p>
                    )}
                    {order.shippingAddress.address.line2 && (
                      <p className={styles.infoText}>{order.shippingAddress.address.line2}</p>
                    )}
                    <p className={styles.infoText}>
                      {order.shippingAddress.address.postal_code} {order.shippingAddress.address.city}
                    </p>
                    {order.shippingAddress.address.country && (
                      <p className={styles.infoText}>{order.shippingAddress.address.country}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

