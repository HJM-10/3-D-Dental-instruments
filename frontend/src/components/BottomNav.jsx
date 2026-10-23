import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingCart, Clock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';

const BottomNav = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useContext(AuthContext);
  const { cart }  = useContext(CartContext);

  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';
  const cartCount   = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  const navItems = [
    { path: '/dashboard',  label: 'Dashboard', icon: Home },
    { path: '/categories', label: 'Catalog',   icon: Grid },
    ...(!isAdminRole ? [{ path: '/cart', label: 'Cart', icon: ShoppingCart, badge: cartCount }] : []),
    { path: '/orders',     label: 'Orders',    icon: Clock },
  ];

  return (
    <div className="bottom-nav" role="navigation" aria-label="Mobile navigation" id="bottom-nav">
      {navItems.map((item) => {
        const Icon     = item.icon;
        const isActive = location.pathname.startsWith(item.path);

        return (
          <button
            key={item.path}
            id={`bottom-nav-${item.label.toLowerCase()}`}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon size={22} />
              {item.badge > 0 && (
                <span className="cart-badge" aria-label={`${item.badge} items`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
