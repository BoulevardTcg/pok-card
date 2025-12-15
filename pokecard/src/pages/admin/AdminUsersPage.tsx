import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Search, Users, Shield, UserCheck } from 'lucide-react';
import styles from './AdminUsersPage.module.css';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
  _count: {
    orders: number;
  };
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, authLoading]);

  async function loadUsers() {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1>Utilisateurs</h1>
          <p>{users.length} utilisateur{users.length > 1 ? 's' : ''} au total</p>
        </div>
      </div>

      <div className={styles.searchBox}>
        <Search size={20} />
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className={styles.empty}>
          <Users size={48} />
          <p>Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Commandes</th>
                <th>Statut</th>
                <th>Inscription</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userInfo}>
                      <div>
                        <p className={styles.userName}>
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username}
                        </p>
                        <p className={styles.userUsername}>@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user._count.orders}</td>
                  <td>
                    <div className={styles.badges}>
                      {user.isAdmin && (
                        <span className={styles.badge} style={{ background: '#3b82f6' }}>
                          <Shield size={12} />
                          Admin
                        </span>
                      )}
                      {user.isVerified && (
                        <span className={styles.badge} style={{ background: '#10b981' }}>
                          <UserCheck size={12} />
                          Vérifié
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
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

