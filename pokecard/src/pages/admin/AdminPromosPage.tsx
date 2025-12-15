import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Plus, Tag, Edit, Trash2 } from 'lucide-react';
import styles from './AdminPromosPage.module.css';

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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setPromos(promos.filter(p => p.id !== promoId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  const isExpired = (promo: Promo) => {
    return new Date(promo.validUntil) < new Date();
  };

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
          <h1>Codes promo</h1>
          <p>{promos.length} code{promos.length > 1 ? 's' : ''} promo au total</p>
        </div>
        <button
          onClick={() => navigate('/admin/promos/new')}
          className={styles.addButton}
        >
          <Plus size={20} />
          Nouveau code
        </button>
      </div>

      {promos.length === 0 ? (
        <div className={styles.empty}>
          <Tag size={48} />
          <p>Aucun code promo</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Valeur</th>
                <th>Utilisations</th>
                <th>Validité</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => (
                <tr key={promo.id}>
                  <td>
                    <span className={styles.code}>{promo.code}</span>
                  </td>
                  <td>{promo.type === 'PERCENTAGE' ? 'Pourcentage' : 'Montant fixe'}</td>
                  <td>
                    {promo.type === 'PERCENTAGE' ? `${promo.value}%` : `${(promo.value / 100).toFixed(2)}€`}
                  </td>
                  <td>
                    {promo.usedCount} / {promo.usageLimit || '∞'}
                  </td>
                  <td>
                    <div className={styles.dates}>
                      <span>{new Date(promo.validFrom).toLocaleDateString('fr-FR')}</span>
                      <span>→</span>
                      <span>{new Date(promo.validUntil).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </td>
                  <td>
                    {!promo.isActive ? (
                      <span className={styles.badge} style={{ background: '#6b7280' }}>Inactif</span>
                    ) : isExpired(promo) ? (
                      <span className={styles.badge} style={{ background: '#ef4444' }}>Expiré</span>
                    ) : (
                      <span className={styles.badge} style={{ background: '#10b981' }}>Actif</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => navigate(`/admin/promos/${promo.id}/edit`)}
                        className={styles.editButton}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deletePromo(promo.id)}
                        className={styles.deleteButton}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

