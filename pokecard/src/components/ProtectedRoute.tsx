import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../authContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Composant de route protégée qui :
 * - Attend que l'authentification soit vérifiée (isLoading === false)
 * - Redirige vers /login si l'utilisateur n'est pas authentifié
 * - Affiche un loader pendant la vérification
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Ne jamais rediriger tant que le chargement n'est pas terminé
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <div>Chargement...</div>
      </div>
    );
  }

  // Rediriger seulement après avoir vérifié l'état d'authentification
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
