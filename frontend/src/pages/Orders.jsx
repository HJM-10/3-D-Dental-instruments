import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Package, Clock, CheckCircle, Truck, FileText } from 'lucide-react';

const Orders = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/');
      // Sort orders descending by ID (newest first)
      setOrders(res.data.sort((a, b) => b.id - a.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (orderId) => {
    window.location.href = `/orders/${orderId}`;
  };

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: '2rem' }}>Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ background: 'var(--bg-base)', padding: '2rem', borderRadius: '50%', marginBottom: '2rem' }}>
          <Package size={64} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>No orders found</h2>
        <p style={{ color: 'var(--text-muted)' }}>You don't have any past orders yet.</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch(status.toLowerCase()) {
      case 'pending': return <Clock size={16} />;
      case 'under manufacturing': return <FileText size={16} />;
      case 'shipped': return <Truck size={16} />;
      case 'delivered': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'pending_approval':
      case 'pending': return '#f59e0b'; // Amber
      case 'approved': return '#10b981'; // Emerald
      case 'requoted': return '#3b82f6'; // Blue
      case 'denied': return '#ef4444'; // Red
      case 'under_manufacturing':
      case 'manufacturing': return '#6366f1'; // Indigo
      case 'shipped': return '#8b5cf6'; // Purple
      case 'delivered': return '#10b981'; // Emerald
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>{isAdminRole ? 'All Orders' : 'My Orders'}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{isAdminRole ? 'Manage and fulfill customer orders.' : 'Review your order history and status.'}</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-base)' }}>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Order ID</th>
              {isAdminRole && <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Customer ID</th>}
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Items</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1.5rem', fontWeight: 600 }}>ORD-{order.id.toString().padStart(4, '0')}</td>
                {isAdminRole && <td style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>USR-{order.user_id}</td>}
                <td style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
                  {order.items.length} items
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
                    {order.items.map(i => i.product.name).join(', ')}
                  </div>
                </td>
                <td style={{ padding: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>${order.total_price.toFixed(2)}</td>
                <td style={{ padding: '1.5rem' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: getStatusColor(order.status),
                    backgroundColor: `${getStatusColor(order.status)}15`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {getStatusIcon(order.status)} {order.status}
                  </span>
                </td>
                <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => handleViewOrder(order.id)}
                  >
                    {isAdminRole ? 'Manage' : 'Track'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
