import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  LayoutDashboard, ShoppingBag, ShoppingCart,
  Settings, Users, Box, BarChart3, Edit3, X, LogOut, FileText,
} from 'lucide-react';

const ROLE_BADGE = {
  super_admin: { label: 'Super Admin', cls: 'badge-secondary' },
  admin:       { label: 'Admin',       cls: 'badge-primary'   },
  user:        { label: 'User',        cls: 'badge-success'   },
};

const NavItem = ({ to, icon: Icon, label, id, onNavigate }) => (
  <NavLink to={to} id={id} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
    <Icon size={18} className="nav-icon" />{label}
  </NavLink>
);

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useContext(AuthContext);
  const toast    = useToast();
  const navigate = useNavigate();

  const isAdminRole  = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const roleInfo     = ROLE_BADGE[user?.role] || ROLE_BADGE.user;

  const initials = user?.name
    ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const close = () => setIsOpen(false);

  const handleLogout = async () => {
    close();
    const confirmed = await toast.confirm(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      'warning'
    );
    if (confirmed) {
      await logout();
      navigate('/login', { replace: true });
    }
  };

  if (!user) return null;

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`} id="main-sidebar" aria-label="Main navigation">
      {/* Logo row */}
      <div className="sidebar-logo">
        <img
          src="/logo.png"
          alt="DNF Trading"
          style={{
            height: 80,
            width: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 8px rgba(58,123,213,0.25))',
            margin: '0 auto'
          }}
        />
        <button
          className="btn-icon mobile-menu-btn"
          onClick={close}
          aria-label="Close sidebar"
          id="sidebar-close-btn"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" role="navigation">
        <span className="sidebar-section-label">Main</span>

        <NavItem onNavigate={close} to="/dashboard"  icon={LayoutDashboard} label="Dashboard"  id="nav-dashboard" />
        <NavItem onNavigate={close} to="/categories" icon={Box}             label={isAdminRole ? 'Categories' : 'Browse instruments'} id="nav-categories" />
        <NavItem onNavigate={close} to="/orders"     icon={ShoppingBag}     label={isAdminRole ? 'Orders' : 'My orders'} id="nav-orders" />
        {!isAdminRole && <NavItem onNavigate={close} to="/quotes" icon={FileText} label="Quotes" id="nav-quotes" />}

        {!isAdminRole && (
          <NavItem onNavigate={close} to="/cart" icon={ShoppingCart} label="Cart" id="nav-cart" />
        )}

        <NavItem onNavigate={close} to="/customize" icon={Edit3}     label={isAdminRole ? 'Customize' : 'Build a kit'} id="nav-customize" />
        <NavItem onNavigate={close} to="/settings"  icon={Settings}  label="Settings"  id="nav-settings" />

        {isAdminRole && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: '0.5rem' }}>
              Administration
            </span>
            <NavItem onNavigate={close} to="/analytics" icon={BarChart3} label="Analytics" id="nav-analytics" />
            {isSuperAdmin && (
              <NavItem onNavigate={close} to="/users" icon={Users} label="Users" id="nav-users" />
            )}
          </>
        )}
      </nav>

      {/* Footer: user card + logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0,
            borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
            overflow: 'hidden', border: '2px solid var(--glass-border)',
          }}>
            {user.profile_image ? (
              <img src={user.profile_image} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </p>
            <span className={`badge ${roleInfo.cls}`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.45rem' }}>
              {roleInfo.label}
            </span>
          </div>
        </div>

        <button
          className="nav-item"
          style={{ color: 'var(--brand-danger)', width: '100%', textAlign: 'left' }}
          onClick={handleLogout}
          id="sidebar-logout-btn"
        >
          <LogOut size={18} className="nav-icon" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
