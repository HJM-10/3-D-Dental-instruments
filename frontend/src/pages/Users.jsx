import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, UserCheck, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const roleMeta = {
  super_admin: {
    label: 'Super Admin',
    icon: ShieldCheck,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
  },
  admin: {
    label: 'Admin',
    icon: ShieldCheck,
    color: 'var(--secondary-color)',
    bg: 'rgba(139, 92, 246, 0.12)',
  },
  user: {
    label: 'Client',
    icon: User,
    color: 'var(--accent-color)',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
};

const Users = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'super_admin';

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/');
      setUsersList(res.data);
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [isSuperAdmin, navigate]);

  const updateRole = async (targetUserId, role, targetName) => {
    const action = role === 'admin' ? 'promote to Admin' : 'remove Admin from';
    const confirmed = await toast.confirm(
      'Change Role',
      `Are you sure you want to ${action} ${targetName}?`,
      'warning'
    );
    if (!confirmed) return;

    setUpdatingUserId(targetUserId);
    try {
      await api.put(`/users/${targetUserId}/role`, { role });
      await fetchUsers();
      toast.success('Role Updated', `${targetName}'s role has been changed to ${role}.`);
    } catch (e) {
      toast.error('Role Update Failed', e.response?.data?.detail || 'Could not update user role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const approveUser = async (targetUserId, targetName) => {
    setUpdatingUserId(targetUserId);
    try {
      await api.put(`/users/${targetUserId}/approve`);
      await fetchUsers();
      toast.success('User Approved', `${targetName} has been approved.`);
    } catch (e) {
      toast.error('Approval Failed', e.response?.data?.detail || 'Could not approve user.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: '2rem' }}>Loading users...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>Users Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Manually promote or demote administrator access.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="card" style={{ padding: '1rem 1.25rem', minWidth: '210px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Admins</div>
            <div style={{ color: 'var(--primary-color)', fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>
              {usersList.filter((u) => u.role === 'admin').length}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: isSuperAdmin ? '820px' : '640px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)' }}>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Profile</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Info</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Contact</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status / IP</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Joined</th>
                {isSuperAdmin && <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Access</th>}
              </tr>
            </thead>
            <tbody>
              {usersList.map((listedUser, index) => {
                const meta = roleMeta[listedUser.role] || roleMeta.user;
                const RoleIcon = meta.icon;
                const isSelf = listedUser.id === user?.id;

                return (
                  <tr key={listedUser.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {listedUser.profile_image ? (
                        <img src={listedUser.profile_image} alt={listedUser.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <User size={20} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{listedUser.name}</div>
                      {(listedUser.business || listedUser.country) && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {listedUser.business} {listedUser.business && listedUser.country && '-'} {listedUser.country}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                      <div>{listedUser.email}</div>
                      {listedUser.phone_number && <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{listedUser.phone_number}</div>}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 700, color: listedUser.is_approved ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                        {listedUser.is_approved ? 'Approved' : 'Pending'}
                      </div>
                      {listedUser.ip_address && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{listedUser.ip_address}</div>}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: meta.color,
                        backgroundColor: meta.bg,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>
                        <RoleIcon size={14} />
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {new Date(listedUser.created_at).toLocaleDateString()}
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        {listedUser.role === 'super_admin' || isSelf ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>Protected</span>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {!listedUser.is_approved && (
                              <button className="btn btn-primary" disabled={updatingUserId === listedUser.id} onClick={() => approveUser(listedUser.id, listedUser.name)} style={{ padding: '0.5rem 0.75rem' }}>
                                <ShieldCheck size={16} /> Approve
                              </button>
                            )}
                            {listedUser.is_approved && listedUser.role === 'user' && (
                              <button className="btn btn-secondary" disabled={updatingUserId === listedUser.id} onClick={() => updateRole(listedUser.id, 'admin', listedUser.name)} style={{ padding: '0.5rem 0.75rem' }}>
                                <UserCheck size={16} /> Make admin
                              </button>
                            )}
                            {listedUser.is_approved && listedUser.role === 'admin' && (
                              <button className="btn btn-secondary" disabled={updatingUserId === listedUser.id} onClick={() => updateRole(listedUser.id, 'user', listedUser.name)} style={{ padding: '0.5rem 0.75rem' }}>
                                <X size={16} /> Remove admin
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
