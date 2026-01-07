import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { API_BASE } from './api';
import { Package, Shield } from 'lucide-react';
import { TwoFactorSettings } from './components/TwoFactorSettings';
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
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: Error) {
      setError('Erreur de connexion au serveur: ' + err.message || 'Erreur inattendue');
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
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: Error) {
      setError('Erreur de connexion au serveur: ' + err.message || 'Erreur inattendue');
    } finally {
      setIsLoading(false);
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
        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <h1>Mon Profil</h1>
            <p>Gérez vos informations personnelles</p>
          </div>

          {message && <div className={styles.successMessage}>{message}</div>}

          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Informations de base */}
          <div className={styles.profileSection}>
            <div className={styles.sectionHeader}>
              <h2>Informations de base</h2>
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
                  <span className={styles.infoValue}>
                    {profileData.firstName || 'Non renseigné'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Nom:</span>
                  <span className={styles.infoValue}>
                    {profileData.lastName || 'Non renseigné'}
                  </span>
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
              <h2>Informations étendues</h2>
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
              <h2>
                <Shield size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
                Sécurité
              </h2>
            </div>
            <TwoFactorSettings token={localStorage.getItem('accessToken') || ''} />
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
      </div>
    </div>
  );
};

export default UserProfile;
