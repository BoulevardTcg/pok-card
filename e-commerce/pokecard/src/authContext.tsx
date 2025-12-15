import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { validateToken } from './utils/security'

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

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
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

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (token && token.length > 0 && validateToken(token)) {
          // Vérifier la validité du token
          const response = await fetch('http://localhost:8080/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
          } else {
            // Token invalide, le supprimer
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
          }
        } else if (token) {
          // Token invalide, le supprimer
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        // Sauvegarder les tokens
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        
        // Mettre à jour l'état utilisateur
        setUser(data.user)
        
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
      const response = await fetch('http://localhost:8080/api/auth/register', {
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
    // Supprimer les tokens
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    
    // Réinitialiser l'état utilisateur
    setUser(null)
    
    // Appeler l'API de déconnexion (optionnel)
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      fetch('http://localhost:8080/api/auth/logout', {
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

      const response = await fetch('http://localhost:8080/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du profil:', error)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
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
