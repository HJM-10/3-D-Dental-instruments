import React, { useContext, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';

/** Full-page skeleton shown while auth is loading */
const AuthSkeleton = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 48, height: 48,
          borderRadius: '50%',
          border: '3px solid var(--glass-border-subtle)',
          borderTopColor: 'var(--brand-primary)',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1rem',
        }}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
        Verifying session...
      </p>
    </div>
  </div>
);

/**
 * ProtectedRoute
 * 
 * adminOnly     — only admin or super_admin may access
 * superAdminOnly — only super_admin may access
 * 
 * No publicRoute: every authenticated route requires a valid session.
 * Unauthenticated users are always redirected to /login.
 */
const ProtectedRoute = ({ adminOnly = false, superAdminOnly = false }) => {
  const { user, loading } = useContext(AuthContext);
  const toast = useToast();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAdminRole    = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin   = user?.role === 'super_admin';

  if (loading) return <AuthSkeleton />;

  // Not authenticated — redirect to login, preserve intended destination
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname, returnState: location.state }}
      />
    );
  }

  // Role checks — redirect with toast notification
  if (superAdminOnly && !isSuperAdmin) {
    toast.error('Access Denied', 'Super Admin privileges are required to view this page.');
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !isAdminRole) {
    toast.error('Access Denied', 'Admin privileges are required to view this page.');
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-container">
      {/* Mobile sidebar backdrop */}
      <div
        className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="main-content">
        <Navbar toggleSidebar={() => setIsSidebarOpen((o) => !o)} />

        <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Outlet />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProtectedRoute;
