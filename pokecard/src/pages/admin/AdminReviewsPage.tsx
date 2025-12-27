import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import styles from './AdminReviewsPage.module.css';

// Icônes SVG
const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? '#FBBF24' : 'none'}
    stroke="#FBBF24"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const StarEmptyIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CheckIcon = () => (
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
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  isVerified: boolean;
  createdAt: string;
  user: { username: string; email: string };
  product: { name: string; slug: string };
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (err: Error) {
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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApproved }),
      });

      if (!response.ok) throw new Error('Erreur lors de la modération');
      loadReviews();
    } catch (err: Error) {
      alert(err.message);
    }
  }

  async function deleteReview(reviewId: string) {
    if (!token || !confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

    try {
      const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');
      setReviews(reviews.filter((r) => r.id !== reviewId));
    } catch (err: Error) {
      alert(err.message);
    }
  }

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement des avis...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <p className={styles.pageCount}>{reviews.length} avis au total</p>
        <div className={styles.filterTabs}>
          <button
            onClick={() => setFilter('all')}
            className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`${styles.filterTab} ${filter === 'pending' ? styles.active : ''}`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`${styles.filterTab} ${filter === 'approved' ? styles.active : ''}`}
          >
            Approuvés
          </button>
        </div>
      </div>

      {/* Content */}
      {reviews.length === 0 ? (
        <div className={styles.empty}>
          <StarEmptyIcon />
          <h3>
            Aucun avis{' '}
            {filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvé' : ''}
          </h3>
          <p>Les avis clients apparaîtront ici.</p>
        </div>
      ) : (
        <div className={styles.reviewsGrid}>
          {reviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewMeta}>
                  <div className={styles.rating}>
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} filled={i < review.rating} />
                    ))}
                  </div>
                  <span className={styles.productName}>{review.product.name}</span>
                </div>
                <span
                  className={`${styles.statusBadge} ${review.isApproved ? styles.approved : styles.pending}`}
                >
                  {review.isApproved ? 'Approuvé' : 'En attente'}
                </span>
              </div>

              {review.title && <h4 className={styles.reviewTitle}>{review.title}</h4>}
              {review.comment && <p className={styles.reviewComment}>{review.comment}</p>}

              <div className={styles.reviewFooter}>
                <div className={styles.authorInfo}>
                  <span className={styles.authorName}>
                    {review.user.username}
                    {review.isVerified && (
                      <span className={styles.verifiedBadge}>✓ Achat vérifié</span>
                    )}
                  </span>
                  <span className={styles.authorEmail}>{review.user.email}</span>
                </div>

                <div className={styles.reviewActions}>
                  {!review.isApproved ? (
                    <button
                      onClick={() => moderateReview(review.id, true)}
                      className={styles.approveBtn}
                    >
                      <CheckIcon /> Approuver
                    </button>
                  ) : (
                    <button
                      onClick={() => moderateReview(review.id, false)}
                      className={styles.rejectBtn}
                    >
                      <XIcon /> Rejeter
                    </button>
                  )}
                  <button onClick={() => deleteReview(review.id)} className={styles.deleteBtn}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
