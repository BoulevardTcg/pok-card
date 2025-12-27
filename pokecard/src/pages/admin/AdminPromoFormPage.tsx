import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ArrowLeft, Save, Percent, Euro, Calendar, Hash } from 'lucide-react';
import styles from './AdminPromoFormPage.module.css';

interface PromoFormData {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase: number;
  maxDiscount: number;
  usageLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export function AdminPromoFormPage() {
  const { promoId } = useParams();
  const isEditing = !!promoId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Valeurs par défaut
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState<PromoFormData>({
    code: '',
    type: 'PERCENTAGE',
    value: 10,
    minPurchase: 0,
    maxDiscount: 0,
    usageLimit: 0,
    validFrom: today,
    validUntil: nextMonth,
    isActive: true,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    if (isEditing) {
      loadPromo();
    }
  }, [user, authLoading, promoId]);

  async function loadPromo() {
    if (!token || !promoId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/promos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      const promo = data.promos?.find((p: any) => p.id === promoId);

      if (!promo) {
        navigate('/admin/promos');
        return;
      }

      setFormData({
        code: promo.code,
        type: promo.type,
        value: promo.value,
        minPurchase: promo.minPurchase || 0,
        maxDiscount: promo.maxDiscount || 0,
        usageLimit: promo.usageLimit || 0,
        validFrom: new Date(promo.validFrom).toISOString().split('T')[0],
        validUntil: new Date(promo.validUntil).toISOString().split('T')[0],
        isActive: promo.isActive,
      });
    } catch (err: Error) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const payload = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: formData.type === 'PERCENTAGE' ? formData.value : formData.value * 100, // Convertir en centimes
        minPurchase: formData.minPurchase > 0 ? formData.minPurchase * 100 : null,
        maxDiscount: formData.maxDiscount > 0 ? formData.maxDiscount * 100 : null,
        usageLimit: formData.usageLimit > 0 ? formData.usageLimit : null,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        isActive: formData.isActive,
      };

      const url = isEditing ? `${API_BASE}/admin/promos/${promoId}` : `${API_BASE}/admin/promos`;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      navigate('/admin/promos');
    } catch (err: Error) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || (isEditing && loading)) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Chargement...</div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => navigate('/admin/promos')} className={styles.backButton}>
            <ArrowLeft size={20} />
            Retour
          </button>
          <h1>{isEditing ? 'Modifier le code promo' : 'Nouveau code promo'}</h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Code promo */}
          <div className={styles.section}>
            <h2>Informations du code</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroupFull}>
                <label>
                  <Hash size={16} />
                  Code promo *
                </label>
                <div className={styles.codeInput}>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    required
                    placeholder="PROMO2024"
                    maxLength={20}
                  />
                  <button type="button" onClick={generateCode} className={styles.generateButton}>
                    Générer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Type et valeur */}
          <div className={styles.section}>
            <h2>Réduction</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Type de réduction *</label>
                <div className={styles.typeSelector}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'PERCENTAGE' })}
                    className={`${styles.typeButton} ${formData.type === 'PERCENTAGE' ? styles.active : ''}`}
                  >
                    <Percent size={20} />
                    Pourcentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'FIXED' })}
                    className={`${styles.typeButton} ${formData.type === 'FIXED' ? styles.active : ''}`}
                  >
                    <Euro size={20} />
                    Montant fixe
                  </button>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Valeur *</label>
                <div className={styles.valueInput}>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
                    }
                    required
                    min="0"
                    max={formData.type === 'PERCENTAGE' ? 100 : 10000}
                    step={formData.type === 'PERCENTAGE' ? 1 : 0.01}
                  />
                  <span className={styles.valueSuffix}>
                    {formData.type === 'PERCENTAGE' ? '%' : '€'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className={styles.section}>
            <h2>Conditions (optionnel)</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Achat minimum (€)</label>
                <input
                  type="number"
                  value={formData.minPurchase}
                  onChange={(e) =>
                    setFormData({ ...formData, minPurchase: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                  placeholder="0 = pas de minimum"
                />
              </div>
              {formData.type === 'PERCENTAGE' && (
                <div className={styles.formGroup}>
                  <label>Réduction max (€)</label>
                  <input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.01"
                    placeholder="0 = illimité"
                  />
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Nombre d'utilisations max</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, usageLimit: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  placeholder="0 = illimité"
                />
              </div>
            </div>
          </div>

          {/* Validité */}
          <div className={styles.section}>
            <h2>Période de validité</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>
                  <Calendar size={16} />
                  Date de début *
                </label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  <Calendar size={16} />
                  Date de fin *
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  required
                  min={formData.validFrom}
                />
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className={styles.section}>
            <div className={styles.toggleGroup}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
              <div>
                <strong>Code actif</strong>
                <p>Le code peut être utilisé par les clients</p>
              </div>
            </div>
          </div>

          {/* Récapitulatif */}
          <div className={styles.summary}>
            <h3>Récapitulatif</h3>
            <p>
              Code <strong>{formData.code || 'XXXX'}</strong> offre{' '}
              <strong>
                {formData.type === 'PERCENTAGE'
                  ? `${formData.value}% de réduction`
                  : `${formData.value}€ de réduction`}
              </strong>
              {formData.minPurchase > 0 && ` pour un achat minimum de ${formData.minPurchase}€`}
              {formData.usageLimit > 0 && `, limité à ${formData.usageLimit} utilisations`}
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => navigate('/admin/promos')}
              className={styles.cancelButton}
            >
              Annuler
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              <Save size={16} />
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
