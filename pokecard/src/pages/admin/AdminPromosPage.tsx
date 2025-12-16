import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import styles from './AdminPromosPage.module.css';

// Icônes SVG
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TagIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l9 4.5v7L12 22l-9-8.5v-7L12 2z" />
    <circle cx="12" cy="10" r="2" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

interface Promo {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  usedCount: number;
  usageLimit?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export function AdminPromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadPromos();
  }, [user, authLoading]);

  async function loadPromos() {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/promos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setPromos(data.promos || []);
    } catch (err: any) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deletePromo(promoId: string) {
    if (!token || !confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) return;

    try {
      const response = await fetch(`${API_BASE}/admin/promos/${promoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');
      setPromos(promos.filter(p => p.id !== promoId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  const isExpired = (promo: Promo) => new Date(promo.validUntil) < new Date();

  const getStatus = (promo: Promo) => {
    if (!promo.isActive) return { label: 'Inactif', className: 'neutral' };
    if (isExpired(promo)) return { label: 'Expiré', className: 'error' };
    return { label: 'Actif', className: 'success' };
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement des codes promo...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <p className={styles.pageCount}>{promos.length} code{promos.length > 1 ? 's' : ''} promo au total</p>
        <button onClick={() => navigate('/admin/promos/new')} className={styles.addButton}>
          <PlusIcon />
          <span>Nouveau code</span>
        </button>
      </div>

      {/* Content */}
      {promos.length === 0 ? (
        <div className={styles.empty}>
          <TagIcon />
          <h3>Aucun code promo</h3>
          <p>Créez votre premier code promo pour commencer.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Réduction</th>
                <th>Utilisations</th>
                <th>Validité</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => {
                const status = getStatus(promo);
                return (
                  <tr key={promo.id}>
                    <td>
                      <span className={styles.code}>{promo.code}</span>
                    </td>
                    <td>
                      <span className={styles.value}>
                        {promo.type === 'PERCENTAGE' ? `${promo.value}%` : `${(promo.value / 100).toFixed(2)}€`}
                      </span>
                      <span className={styles.type}>
                        {promo.type === 'PERCENTAGE' ? 'Pourcentage' : 'Montant fixe'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.usage}>
                        {promo.usedCount} / {promo.usageLimit || '∞'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.dates}>
                        <span>{new Date(promo.validFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        <span className={styles.arrow}>→</span>
                        <span>{new Date(promo.validUntil).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[status.className]}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => navigate(`/admin/promos/${promo.id}/edit`)}
                          className={styles.actionButton}
                          title="Modifier"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => deletePromo(promo.id)}
                          className={`${styles.actionButton} ${styles.danger}`}
                          title="Supprimer"
                        >
                          <TrashIcon />
                        </button>
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
