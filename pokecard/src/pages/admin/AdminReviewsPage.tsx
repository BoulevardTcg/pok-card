import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Star, Check, X, Trash2 } from 'lucide-react';
import styles from './AdminReviewsPage.module.css';

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  isVerified: boolean;
  createdAt: string;
  user: {
    username: string;
    email: string;
  };
  product: {
    name: string;
    slug: string;
  };
}

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadReviews();
  }, [user, authLoading, filter]);

  async function loadReviews() {
    if (!token) return;

    try {
      setLoading(true);
      const status = filter === 'all' ? undefined : filter;
      const response = await fetch(`${API_BASE}/admin/reviews?status=${status || ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (err: any) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }

  async function moderateReview(reviewId: string, isApproved: boolean) {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isApproved })
      });

      if (!response.ok) throw new Error('Erreur lors de la modération');

      loadReviews();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function deleteReview(reviewId: string) {
    if (!token || !confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

    try {
      const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setReviews(reviews.filter(r => r.id !== reviewId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filteredReviews = reviews;

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
          <h1>Modération des avis</h1>
          <p>{reviews.length} avis au total</p>
        </div>
        <div className={styles.filters}>
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? styles.active : ''}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? styles.active : ''}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={filter === 'approved' ? styles.active : ''}
          >
            Approuvés
          </button>
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className={styles.empty}>
          <Star size={48} />
          <p>Aucun avis {filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvé' : ''}</p>
        </div>
      ) : (
        <div className={styles.reviewsList}>
          {filteredReviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div>
                  <div className={styles.rating}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        fill={i < review.rating ? '#fbbf24' : 'none'}
                        color="#fbbf24"
                      />
                    ))}
                  </div>
                  <p className={styles.productName}>{review.product.name}</p>
                  <p className={styles.userInfo}>
                    Par {review.user.username} ({review.user.email})
                    {review.isVerified && (
                      <span className={styles.verified}>✓ Vérifié</span>
                    )}
                  </p>
                </div>
                <div className={styles.status}>
                  {review.isApproved ? (
                    <span className={styles.badge} style={{ background: '#10b981' }}>Approuvé</span>
                  ) : (
                    <span className={styles.badge} style={{ background: '#f59e0b' }}>En attente</span>
                  )}
                </div>
              </div>
              {review.title && <h3 className={styles.reviewTitle}>{review.title}</h3>}
              {review.comment && <p className={styles.reviewComment}>{review.comment}</p>}
              <div className={styles.reviewActions}>
                {!review.isApproved && (
                  <button
                    onClick={() => moderateReview(review.id, true)}
                    className={styles.approveButton}
                  >
                    <Check size={16} />
                    Approuver
                  </button>
                )}
                {review.isApproved && (
                  <button
                    onClick={() => moderateReview(review.id, false)}
                    className={styles.rejectButton}
                  >
                    <X size={16} />
                    Rejeter
                  </button>
                )}
                <button
                  onClick={() => deleteReview(review.id)}
                  className={styles.deleteButton}
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

