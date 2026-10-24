import { useContext, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import {
  Menu, Sun, Moon, LogOut, Settings,
  ShoppingCart, ChevronRight, Palette, Search, ArrowRight,
} from 'lucide-react';
import { useAppearance } from '../context/AppearanceContext';
import AppearancePanel from './AppearancePanel';

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
  '/quotes':     'Quotes',
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

  const { mode: theme, setMode: setTheme } = useAppearance();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(null);
  const search = searchDraft?.key === location.key ? searchDraft.value : new URLSearchParams(location.search).get('q') || '';
  const setSearch = (value) => setSearchDraft({ key: location.key, value });
  const appearanceRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdminRole  = user?.role === 'admin' || user?.role === 'super_admin';
  const cartCount    = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const matchedRoute = Object.keys(ROUTE_LABELS).find(route => location.pathname.startsWith(route));
  const currentLabel = matchedRoute ? ROUTE_LABELS[matchedRoute] : 'Dashboard';
  const roleInfo     = ROLE_BADGE[user?.role] || ROLE_BADGE.user;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (appearanceRef.current && !appearanceRef.current.contains(e.target)) setAppearanceOpen(false);
    };
    document.addEventListener('mousedown', handler);
    const onKey = (event) => { if (event.key === 'Escape') { setAppearanceOpen(false); setDropdownOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', onKey); };
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
        {!isAdminRole && <form className="customer-global-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate(`/categories?q=${encodeURIComponent(search.trim())}`); }}>
          <Search size={18} /><input aria-label="Search instruments" placeholder="Search instruments, kits, or part numbers…" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="submit" aria-label="Submit instrument search"><ArrowRight size={17} /></button>
        </form>}
      </div>

      {/* Right side */}
      <div className="topbar-right">
        {isAdminRole && <div className="appearance-menu" ref={appearanceRef}>
          <button className="btn-icon" aria-label="Customize appearance" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen((open) => !open)}><Palette size={19} /></button>
          {appearanceOpen && <div className="appearance-popover"><AppearancePanel /></div>}
        </div>}
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
