import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import styles from './AdminUsersPage.module.css';

// Icônes SVG
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const UsersIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="17" cy="7" r="3" />
    <path d="M21 21v-2a3 3 0 0 0-2-2.83" />
  </svg>
);

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
  _count: { orders: number };
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
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: Error) {
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
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement des utilisateurs...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <p className={styles.pageCount}>{users.length} utilisateur{users.length > 1 ? 's' : ''} au total</p>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {filteredUsers.length === 0 ? (
        <div className={styles.empty}>
          <UsersIcon />
          <h3>Aucun utilisateur trouvé</h3>
          <p>Essayez de modifier votre recherche.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
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
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userAvatar}>
                        {(u.firstName || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>
                          {u.firstName && u.lastName
                            ? `${u.firstName} ${u.lastName}`
                            : u.username}
                        </span>
                        <span className={styles.userUsername}>@{u.username}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.email}>{u.email}</span>
                  </td>
                  <td>
                    <span className={styles.orderCount}>{u._count.orders}</span>
                  </td>
                  <td>
                    <div className={styles.badges}>
                      {u.isAdmin && (
                        <span className={`${styles.badge} ${styles.admin}`}>Admin</span>
                      )}
                      {u.isVerified && (
                        <span className={`${styles.badge} ${styles.verified}`}>Vérifié</span>
                      )}
                      {!u.isAdmin && !u.isVerified && (
                        <span className={`${styles.badge} ${styles.pending}`}>En attente</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles.date}>
                      {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
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
