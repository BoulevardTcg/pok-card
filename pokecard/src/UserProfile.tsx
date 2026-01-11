import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { Package, Shield, Download, Trash2, AlertTriangle, User, Mail, Lock } from 'lucide-react';
import { TwoFactorSettings } from './components/TwoFactorSettings';
import { API_BASE } from './api';
import styles from './UserProfile.module.css';

interface ProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
}

interface ExtendedProfileData {
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  birthDate?: string;
}

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [extendedProfileData, setExtendedProfileData] = useState<ExtendedProfileData>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingExtended, setIsEditingExtended] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
      });

      if (user.profile) {
        setExtendedProfileData({
          phone: user.profile.phone || '',
          address: user.profile.address || '',
          city: user.profile.city || '',
          postalCode: user.profile.postalCode || '',
          country: user.profile.country || '',
          birthDate: user.profile.birthDate || '',
        });
      }
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExtendedProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExtendedProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateProfile = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        setMessage('Profil mis à jour avec succès !');
        setIsEditingProfile(false);
        // Rafraîchir les données utilisateur
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur: ' + (err.message || 'Erreur inattendue'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateExtendedProfile = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/users/profile/extended`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(extendedProfileData),
      });

      if (response.ok) {
        setMessage('Profil étendu mis à jour avec succès !');
        setIsEditingExtended(false);
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur: ' + (err.message || 'Erreur inattendue'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/gdpr/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mes-donnees-${user?.username || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage('Vos données ont été téléchargées avec succès !');
      } else {
        const data = await response.json();
        setError(data.error || "Erreur lors de l'export");
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur: ' + (err.message || 'Erreur inattendue'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER MON COMPTE') {
      setError('Veuillez taper "SUPPRIMER MON COMPTE" pour confirmer');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/gdpr/delete-now`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: deletePassword,
          confirmation: deleteConfirmation,
        }),
      });

      if (response.ok) {
        setMessage('Votre compte a été supprimé. Vous allez être déconnecté...');
        setTimeout(() => {
          logout();
          navigate('/');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la suppression');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur: ' + (err.message || 'Erreur inattendue'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.profileCard}>
            <h2>Profil non disponible</h2>
            <p>Vous devez être connecté pour accéder à votre profil.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Mon Profil</h1>
          <div className={styles.divider}></div>
          <p className={styles.description}>Gérez vos informations personnelles et paramètres</p>
        </div>

        {/* Profile Header Card */}
        <div className={styles.profileHeaderCard}>
          <div className={styles.avatar}>
            <User size={40} />
          </div>
          <div className={styles.userInfo}>
            <h2 className={styles.userName}>{user.username}</h2>
            <p className={styles.userEmail}>{user.email}</p>
          </div>
        </div>

        {message && <div className={styles.successMessage}>{message}</div>}

        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Informations de base */}
        <div className={styles.profileSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <User size={20} />
              <h2>Informations de base</h2>
            </div>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className={styles.editButton}
            >
              {isEditingProfile ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          {isEditingProfile ? (
            <div className={styles.editForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="firstName">Prénom</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="lastName">Nom</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  className={`${styles.formInput} ${styles.formTextarea}`}
                  rows={3}
                  placeholder="Parlez-nous de vous..."
                />
              </div>
              <button onClick={updateProfile} disabled={isLoading} className={styles.saveButton}>
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          ) : (
            <div className={styles.profileInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Prénom:</span>
                <span className={styles.infoValue}>{profileData.firstName || 'Non renseigné'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Nom:</span>
                <span className={styles.infoValue}>{profileData.lastName || 'Non renseigné'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Bio:</span>
                <span className={styles.infoValue}>{profileData.bio || 'Aucune bio'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Informations étendues */}
        <div className={styles.profileSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Mail size={20} />
              <h2>Informations de contact</h2>
            </div>
            <button
              onClick={() => setIsEditingExtended(!isEditingExtended)}
              className={styles.editButton}
            >
              {isEditingExtended ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          {isEditingExtended ? (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label htmlFor="phone">Téléphone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={extendedProfileData.phone}
                  onChange={handleExtendedProfileChange}
                  className={styles.formInput}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="address">Adresse</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={extendedProfileData.address}
                  onChange={handleExtendedProfileChange}
                  className={styles.formInput}
                  placeholder="123 Rue de la Paix"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="city">Ville</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={extendedProfileData.city}
                    onChange={handleExtendedProfileChange}
                    className={styles.formInput}
                    placeholder="Paris"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="postalCode">Code postal</label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={extendedProfileData.postalCode}
                    onChange={handleExtendedProfileChange}
                    className={styles.formInput}
                    placeholder="75001"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="country">Pays</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={extendedProfileData.country}
                  onChange={handleExtendedProfileChange}
                  className={styles.formInput}
                  placeholder="France"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="birthDate">Date de naissance</label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={extendedProfileData.birthDate}
                  onChange={handleExtendedProfileChange}
                  className={styles.formInput}
                />
              </div>
              <button
                onClick={updateExtendedProfile}
                disabled={isLoading}
                className={styles.saveButton}
              >
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          ) : (
            <div className={styles.profileInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Téléphone:</span>
                <span className={styles.infoValue}>
                  {extendedProfileData.phone || 'Non renseigné'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Adresse:</span>
                <span className={styles.infoValue}>
                  {extendedProfileData.address || 'Non renseignée'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Ville:</span>
                <span className={styles.infoValue}>
                  {extendedProfileData.city || 'Non renseignée'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Code postal:</span>
                <span className={styles.infoValue}>
                  {extendedProfileData.postalCode || 'Non renseigné'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Pays:</span>
                <span className={styles.infoValue}>
                  {extendedProfileData.country || 'Non renseigné'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Date de naissance:</span>
                <span className={styles.infoValue}>
                  {extendedProfileData.birthDate
                    ? new Date(extendedProfileData.birthDate).toLocaleDateString('fr-FR')
                    : 'Non renseignée'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sécurité - 2FA */}
        <div className={styles.profileSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Shield size={20} />
              <h2>Sécurité</h2>
            </div>
          </div>
          <TwoFactorSettings token={localStorage.getItem('accessToken') || ''} />
        </div>

        {/* Données et confidentialité - RGPD */}
        <div className={`${styles.profileSection} ${styles.dangerZone}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Lock size={20} />
              <h2>Données et confidentialité</h2>
            </div>
          </div>
          <div className={styles.gdprActions}>
            <div className={styles.gdprAction}>
              <div className={styles.gdprActionInfo}>
                <Download size={20} />
                <div>
                  <h3>Exporter mes données</h3>
                  <p>Téléchargez toutes vos données personnelles au format JSON</p>
                </div>
              </div>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className={styles.exportButton}
              >
                {isExporting ? 'Export en cours...' : 'Exporter'}
              </button>
            </div>

            <div className={styles.gdprAction}>
              <div className={styles.gdprActionInfo}>
                <Trash2 size={20} />
                <div>
                  <h3>Supprimer mon compte</h3>
                  <p>
                    Cette action est définitive. Toutes vos données personnelles seront supprimées.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDeleteModal(true)} className={styles.deleteButton}>
                Supprimer
              </button>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className={styles.profileActions}>
          <div className={styles.quickLinks}>
            <button onClick={() => navigate('/orders')} className={styles.quickLink}>
              <Package size={18} />
              Mes commandes
            </button>
          </div>
          <button onClick={logout} className={styles.logoutButton}>
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={24} className={styles.modalIcon} />
              <h2>Supprimer mon compte</h2>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalWarning}>
                Cette action est <strong>irréversible</strong>. Toutes vos données personnelles
                seront définitivement supprimées :
              </p>
              <ul className={styles.modalList}>
                <li>Votre profil et informations personnelles</li>
                <li>Vos favoris et collection</li>
                <li>Vos avis et commentaires</li>
                <li>Vos offres d'échange</li>
              </ul>
              <p className={styles.modalNote}>
                <strong>Note :</strong> Vos commandes seront conservées de manière anonyme pour des
                raisons légales (facturation).
              </p>
              <div className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="deletePassword">Mot de passe</label>
                  <input
                    type="password"
                    id="deletePassword"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className={styles.formInput}
                    placeholder="Entrez votre mot de passe"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="deleteConfirmation">
                    Tapez <strong>SUPPRIMER MON COMPTE</strong> pour confirmer
                  </label>
                  <input
                    type="text"
                    id="deleteConfirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className={styles.formInput}
                    placeholder="SUPPRIMER MON COMPTE"
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteConfirmation('');
                  setError('');
                }}
                className={styles.modalCancelButton}
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={
                  isDeleting || !deletePassword || deleteConfirmation !== 'SUPPRIMER MON COMPTE'
                }
                className={styles.modalDeleteButton}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
