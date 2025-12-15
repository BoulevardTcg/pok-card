import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { API_BASE } from './api'

export interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  isAdmin: boolean
  isVerified: boolean
  createdAt: string
  profile?: {
    phone?: string
    address?: string
    city?: string
    postalCode?: string
    country?: string
    birthDate?: string
  }
}

export interface LoginResult {
  success: boolean
  error?: string
  requiresTwoFactor?: boolean
  email?: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  login: (email: string, password: string, twoFactorCode?: string) => Promise<LoginResult>
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
}

export interface RegisterData {
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  // Vérifier si un token JWT est expiré
  const isTokenExpired = (accessToken: string): boolean => {
    try {
      const payloadPart = accessToken.split('.')[1]
      if (!payloadPart) return true
      const payload = JSON.parse(atob(payloadPart))
      if (!payload.exp) return false
      // Ajouter 10 secondes de marge pour éviter les problèmes de timing
      return Date.now() >= (payload.exp * 1000) - 10000
    } catch {
      return true
    }
  }

  // Décoder un token JWT côté client (sans vérification de signature) pour éviter les redirections
  // prématurées en cas d'erreur réseau ou de profil indisponible.
  const decodeAccessToken = (accessToken: string): Partial<User> | null => {
    try {
      const payloadPart = accessToken.split('.')[1]
      if (!payloadPart) return null
      const payload = JSON.parse(atob(payloadPart))
      return {
        id: payload.userId,
        email: payload.email,
        username: payload.username,
        isAdmin: !!payload.isAdmin,
        isVerified: true,
        createdAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString()
      }
    } catch {
      return null
    }
  }

  // Fonction pour rafraîchir le token
  const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      })
      
      if (response.ok) {
        const data = await response.json()
        const newAccessToken = data.accessToken
        localStorage.setItem('accessToken', newAccessToken)
        setToken(newAccessToken)
        return newAccessToken
      }
      return null
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token:', error)
      return null
    }
  }

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const storedToken = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')
        
        // Fonction helper pour charger le profil
        const loadProfile = async (accessToken: string) => {
          try {
            const response = await fetch(`${API_BASE}/users/profile`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (response.ok) {
              const data = await response.json()
              setUser(data.user)
            }
          } catch {
            // Silently fail - user is already set from decoded token
          }
        }
        
        // Cas 1: On a un token d'accès
        if (storedToken && storedToken.length > 0) {
          // Pré-remplir avec le payload décodé
          const decoded = decodeAccessToken(storedToken)
          if (decoded) {
            setUser((prev) => prev ?? (decoded as User))
          }
          
          // Si le token n'est pas expiré, l'utiliser directement
          if (!isTokenExpired(storedToken)) {
            setToken(storedToken)
            await loadProfile(storedToken)
          } 
          // Si le token est expiré, essayer de le rafraîchir
          else if (refreshToken) {
            const newAccessToken = await refreshAccessToken(refreshToken)
            if (newAccessToken) {
              const decodedNew = decodeAccessToken(newAccessToken)
              if (decodedNew) {
                setUser(decodedNew as User)
              }
              await loadProfile(newAccessToken)
            } else {
              // Refresh échoué, déconnecter
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              setToken(null)
              setUser(null)
            }
          } else {
            // Pas de refresh token, déconnecter
            localStorage.removeItem('accessToken')
            setToken(null)
            setUser(null)
          }
        } 
        // Cas 2: Pas de token d'accès mais on a un refresh token
        else if (refreshToken) {
          const newAccessToken = await refreshAccessToken(refreshToken)
          if (newAccessToken) {
            const decodedNew = decodeAccessToken(newAccessToken)
            if (decodedNew) {
              setUser(decodedNew as User)
            }
            await loadProfile(newAccessToken)
          } else {
            // Refresh token invalide
            localStorage.removeItem('refreshToken')
            setToken(null)
            setUser(null)
          }
        }
      } catch (error) {
        console.error('Erreur auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [])

  const login = async (email: string, password: string, twoFactorCode?: string): Promise<LoginResult> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, twoFactorCode })
      })

      const data = await response.json()

      // Si le 2FA est requis
      if (data.requiresTwoFactor && !data.accessToken) {
        return {
          success: false,
          requiresTwoFactor: true,
          email: data.email
        }
      }

      // Si code 2FA invalide
      if (data.code === 'INVALID_2FA_CODE') {
        return {
          success: false,
          error: 'Code 2FA invalide',
          requiresTwoFactor: true,
          email: email
        }
      }

      if (response.ok && data.accessToken) {
        // Sauvegarder les tokens
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        setToken(data.accessToken)
        
        // Récupérer le profil complet de l'utilisateur
        try {
          const profileResponse = await fetch(`${API_BASE}/users/profile`, {
            headers: {
              'Authorization': `Bearer ${data.accessToken}`
            }
          })
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json()
            setUser(profileData.user)
          } else {
            // Si on ne peut pas récupérer le profil, utiliser les données de base du login
            setUser(data.user)
          }
        } catch (profileError) {
          console.error('Erreur lors de la récupération du profil:', profileError)
          // Utiliser les données de base du login en cas d'erreur
          setUser(data.user)
        }
        
        return { success: true }
      } else {
        return { 
          success: false, 
          error: data.error || 'Erreur de connexion' 
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error)
      return { 
        success: false, 
        error: 'Erreur de connexion au serveur' 
      }
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true }
      } else {
        return { 
          success: false, 
          error: data.error || 'Erreur d\'inscription' 
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error)
      return { 
        success: false, 
        error: 'Erreur d\'inscription au serveur' 
      }
    }
  }

  const logout = () => {
    // Récupérer le refreshToken avant de le supprimer
    const refreshToken = localStorage.getItem('refreshToken')
    
    // Supprimer les tokens
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setToken(null)
    
    // Réinitialiser l'état utilisateur
    setUser(null)
    
    // Appeler l'API de déconnexion (optionnel)
    if (refreshToken) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      }).catch(console.error)
    }
  }

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const response = await fetch(`${API_BASE}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else if (response.status === 401 || response.status === 403) {
        // Token invalide ou expiré, déconnecter l'utilisateur
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setToken(null)
        setUser(null)
      } else {
        // Autre erreur : garder une session minimale décodée
        const decoded = decodeAccessToken(token)
        if (decoded) {
          setUser((decoded as User))
        }
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du profil:', error)
      const decoded = token ? decodeAccessToken(token) : null
      if (decoded) {
        setUser((decoded as User))
      }
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user || !!token,
    isLoading,
    token,
    login,
    register,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
