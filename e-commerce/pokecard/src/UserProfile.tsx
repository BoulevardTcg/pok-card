import React, { useState, useEffect } from 'react'
import { useAuth } from './authContext'
import './UserProfile.css'

interface ProfileData {
  firstName?: string
  lastName?: string
  bio?: string
}

interface ExtendedProfileData {
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  birthDate?: string
}

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData>({})
  const [extendedProfileData, setExtendedProfileData] = useState<ExtendedProfileData>({})
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingExtended, setIsEditingExtended] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || ''
      })
      
      if (user.profile) {
        setExtendedProfileData({
          phone: user.profile.phone || '',
          address: user.profile.address || '',
          city: user.profile.city || '',
          postalCode: user.profile.postalCode || '',
          country: user.profile.country || '',
          birthDate: user.profile.birthDate || ''
        })
      }
    }
  }, [user])

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleExtendedProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setExtendedProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const updateProfile = async () => {
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('http://localhost:8080/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        setMessage('Profil mis à jour avec succès !')
        setIsEditingProfile(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  const updateExtendedProfile = async () => {
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('http://localhost:8080/api/users/profile/extended', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(extendedProfileData)
      })

      if (response.ok) {
        setMessage('Profil étendu mis à jour avec succès !')
        setIsEditingExtended(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <h2>Profil non disponible</h2>
          <p>Vous devez être connecté pour accéder à votre profil.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>Mon Profil</h1>
          <p>Gérez vos informations personnelles</p>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Informations de base */}
        <div className="profile-section">
          <div className="section-header">
            <h2>Informations de base</h2>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="edit-button"
            >
              {isEditingProfile ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          {isEditingProfile ? (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">Prénom</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Nom</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  className="form-textarea"
                  rows={3}
                  placeholder="Parlez-nous de vous..."
                />
              </div>
              <button
                onClick={updateProfile}
                disabled={isLoading}
                className="save-button"
              >
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          ) : (
            <div className="profile-info">
              <div className="info-row">
                <span className="info-label">Prénom:</span>
                <span className="info-value">{profileData.firstName || 'Non renseigné'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Nom:</span>
                <span className="info-value">{profileData.lastName || 'Non renseigné'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Bio:</span>
                <span className="info-value">{profileData.bio || 'Aucune bio'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Informations étendues */}
        <div className="profile-section">
          <div className="section-header">
            <h2>Informations étendues</h2>
            <button
              onClick={() => setIsEditingExtended(!isEditingExtended)}
              className="edit-button"
            >
              {isEditingExtended ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          {isEditingExtended ? (
            <div className="edit-form">
              <div className="form-group">
                <label htmlFor="phone">Téléphone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={extendedProfileData.phone}
                  onChange={handleExtendedProfileChange}
                  className="form-input"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              <div className="form-group">
                <label htmlFor="address">Adresse</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={extendedProfileData.address}
                  onChange={handleExtendedProfileChange}
                  className="form-input"
                  placeholder="123 Rue de la Paix"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">Ville</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={extendedProfileData.city}
                    onChange={handleExtendedProfileChange}
                    className="form-input"
                    placeholder="Paris"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="postalCode">Code postal</label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={extendedProfileData.postalCode}
                    onChange={handleExtendedProfileChange}
                    className="form-input"
                    placeholder="75001"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="country">Pays</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={extendedProfileData.country}
                  onChange={handleExtendedProfileChange}
                  className="form-input"
                  placeholder="France"
                />
              </div>
              <div className="form-group">
                <label htmlFor="birthDate">Date de naissance</label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={extendedProfileData.birthDate}
                  onChange={handleExtendedProfileChange}
                  className="form-input"
                />
              </div>
              <button
                onClick={updateExtendedProfile}
                disabled={isLoading}
                className="save-button"
              >
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          ) : (
            <div className="profile-info">
              <div className="info-row">
                <span className="info-label">Téléphone:</span>
                <span className="info-value">{extendedProfileData.phone || 'Non renseigné'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Adresse:</span>
                <span className="info-value">{extendedProfileData.address || 'Non renseignée'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ville:</span>
                <span className="info-value">{extendedProfileData.city || 'Non renseignée'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Code postal:</span>
                <span className="info-value">{extendedProfileData.postalCode || 'Non renseigné'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Pays:</span>
                <span className="info-value">{extendedProfileData.country || 'Non renseigné'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Date de naissance:</span>
                <span className="info-value">
                  {extendedProfileData.birthDate 
                    ? new Date(extendedProfileData.birthDate).toLocaleDateString('fr-FR')
                    : 'Non renseignée'
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <button onClick={logout} className="logout-button">
            🚪 Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
