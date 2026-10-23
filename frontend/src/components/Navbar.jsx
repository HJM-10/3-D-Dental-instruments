import React, { useContext, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import {
  Menu, Sun, Moon, LogOut, Settings, User,
  ShoppingCart, ChevronRight,
} from 'lucide-react';

const ROUTE_LABELS = {
  '/dashboard':  'Dashboard',
  '/categories': 'Categories',
  '/products':   'Product Details',
  '/cart':       'Cart',
  '/orders':     'Orders',
  '/settings':   'Settings',
  '/analytics':  'Analytics',
  '/users':      'Users',
  '/customize':  'Customize',
};

const ROLE_BADGE = {
  super_admin: { label: 'Super Admin', cls: 'badge-secondary' },
  admin:       { label: 'Admin',       cls: 'badge-primary'   },
  user:        { label: 'User',        cls: 'badge-success'   },
};

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const { cart }         = useContext(CartContext);
  const toast            = useToast();
  const navigate         = useNavigate();
  const location         = useLocation();

  const [theme, setTheme]       = useState(() => localStorage.getItem('theme') || 'dark');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdminRole  = user?.role === 'admin' || user?.role === 'super_admin';
  const cartCount    = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const matchedRoute = Object.keys(ROUTE_LABELS).find(route => location.pathname.startsWith(route));
  const currentLabel = matchedRoute ? ROUTE_LABELS[matchedRoute] : 'Dashboard';
  const roleInfo     = ROLE_BADGE[user?.role] || ROLE_BADGE.user;

  // Sync theme with document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
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

  // Get user initials for avatar fallback
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="topbar" id="main-navbar">
      {/* Left side */}
      <div className="topbar-left">
        <button
          className="btn-icon mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          id="sidebar-toggle-btn"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <nav className="breadcrumb desktop-only" aria-label="Breadcrumb">

          <ChevronRight size={14} className="breadcrumb-sep" />
          <span className="breadcrumb-current">{currentLabel}</span>
        </nav>

        {/* Mobile: just show page title */}
        <span className="topbar-title mobile-only-flex" id="topbar-mobile-title">
          {currentLabel}
        </span>
      </div>

      {/* Right side */}
      <div className="topbar-right">
        {/* Cart badge (non-admin only) */}
        {!isAdminRole && (
          <div className="cart-badge-wrap">
            <button
              className="btn-icon"
              onClick={() => navigate('/cart')}
              aria-label={`Cart — ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
              id="navbar-cart-btn"
            >
              <ShoppingCart size={18} />
            </button>
            {cartCount > 0 && (
              <span className="cart-badge" aria-hidden="true">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle color theme"
          aria-pressed={theme === 'dark'}
          id="navbar-theme-toggle"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <div className="theme-toggle-knob">
            {theme === 'dark' ? <Moon size={11} /> : <Sun size={11} />}
          </div>
        </button>

        {/* User menu */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            className="user-menu-trigger"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            id="user-menu-trigger"
          >
            <div className="user-avatar">
              {user.profile_image ? (
                <img src={user.profile_image} alt={user.name} />
              ) : (
                initials
              )}
            </div>
            <div className="desktop-only" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--text-primary)' }}>
                {user.name}
              </div>
              <span className={`badge ${roleInfo.cls}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>
                {roleInfo.label}
              </span>
            </div>
          </button>

          {dropdownOpen && (
            <div className="user-dropdown card" style={{ padding: '0.5rem' }} id="user-dropdown-menu">
              {/* User info header */}
              <div style={{ padding: '0.6rem 0.8rem 0.75rem', borderBottom: '1px solid var(--glass-border-subtle)', marginBottom: '0.35rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.name}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</p>
              </div>

              <div
                className="dropdown-item"
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                role="menuitem"
                id="dropdown-settings"
              >
                <Settings size={16} />
                Settings
              </div>

              <div className="dropdown-divider" />

              <div
                className="dropdown-item danger"
                onClick={handleLogout}
                role="menuitem"
                id="dropdown-logout"
              >
                <LogOut size={16} />
                Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
