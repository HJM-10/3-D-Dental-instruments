import React, { useContext, useState, useEffect } from 'react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, CreditCard, CheckCircle, Copy, Mail, FileText, Target } from 'lucide-react';
import OrderConfigurationDisplay from '../components/OrderConfigurationDisplay';

const Cart = () => {
  const { cart, fetchCart, removeFromCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';
  const [contactMethod, setContactMethod] = useState('email');
  const [contactValue, setContactValue] = useState(user?.email || '');
  
  // Admin state
  const [adminCarts, setAdminCarts] = useState([]);

  useEffect(() => {
    if (isAdminRole) {
      fetchAdminCarts();
    }
  }, [isAdminRole]);

  const fetchAdminCarts = async () => {
    try {
      const res = await api.get('/cart/all');
      setAdminCarts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    toast.success('Copied', 'Email address copied to clipboard.');
  };

  if (isAdminRole) {
    return (
      <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>Active Customer Carts</h2>
          <p style={{ color: 'var(--text-muted)' }}>Global view of items currently sitting in customers' carts.</p>
        </div>

        {adminCarts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
            <ShoppingCart size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>No active customer carts right now.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-base)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Customer Email</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Product ID & Name</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Marketing Insight</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {adminCarts.map(customerCart => (
                  customerCart.items.map((item, index) => (
                    <tr key={`${customerCart.id}-${item.id}`} style={{ borderTop: index === 0 ? '2px solid var(--primary-glow)' : '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1.5rem', fontWeight: index === 0 ? 600 : 400, color: index === 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {index === 0 ? customerCart.user?.email : ''}
                      </td>
                      <td style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: 'var(--bg-base)', borderRadius: '0.25rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            #{item.product.id}
                          </span>
                          <span>{item.product.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.5rem', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ padding: '1.5rem' }}>
                        {index === 0 && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--glow-warning)', border: '1px solid var(--brand-warning)', color: 'var(--brand-warning)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                            <Target size={14} /> Hot Lead: Cart Abandoned
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1.5rem' }}>
                        {index === 0 && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => handleCopyEmail(customerCart.user?.email)} title="Copy Email" style={{ padding: '0.5rem' }}>
                              <Copy size={16} />
                            </button>
                            <a href={`mailto:${customerCart.user?.email}`} className="btn btn-primary" title="Email Customer" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                              <Mail size={16} />
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // --- USER VIEW ---

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ background: 'var(--bg-base)', padding: '2rem', borderRadius: '50%', marginBottom: '2rem' }}>
          <ShoppingCart size={64} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Your cart is empty</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Looks like you haven't added any instruments yet.</p>
        <button className="btn btn-primary" onClick={() => navigate('/categories')}>
          Browse Categories
        </button>
      </div>
    );
  }

  const calculateTotal = () => {
    return cart.items.reduce((total, item) => total + (item.product.base_price * item.quantity), 0);
  };

  const handleRemoveItem = async (item) => {
    const confirmed = await toast.confirm(
      'Remove Item',
      `Remove "${item.product.name}" from your cart?`,
      'danger'
    );
    if (confirmed) removeFromCart(item.id);
  };

  const handleCheckout = async () => {
    if (!contactValue.trim()) {
      toast.error('Missing Contact', 'Please provide a contact number or email.');
      return;
    }
    const confirmed = await toast.confirm(
      'Place Order',
      'Confirm your order? You will be redirected to your orders page.',
      'info'
    );
    if (!confirmed) return;

    setCheckingOut(true);
    try {
      await api.post('/orders/create', {
        contact_method: contactMethod,
        contact_value: contactValue
      });
      await fetchCart();
      toast.success('Order Placed', 'Your order has been submitted successfully!');
      setTimeout(() => navigate('/orders'), 1200);
    } catch {
      toast.error('Checkout Failed', 'Could not place your order. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>Your Cart</h2>
        <p style={{ color: 'var(--text-muted)' }}>Review your items before checkout.</p>
      </div>

      <div className="flex-mobile-col" style={{ display: 'flex', gap: '2rem', flex: 1, alignItems: 'flex-start' }}>
        {/* Cart Items List */}
        <div className="card" style={{ flex: 2, padding: 0, overflow: 'hidden', width: '100%' }}>
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-base)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Product</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Price</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map(item => (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                      {item.configuration && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <div style={{ marginTop: '0.5rem' }}>
                            <OrderConfigurationDisplay configuration={item.configuration} productId={item.product_id} />
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>${item.product.base_price.toFixed(2)}</td>
                    <td style={{ padding: '1.5rem', fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ padding: '1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>${(item.product.base_price * item.quantity).toFixed(2)}</td>
                    <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleRemoveItem(item)}
                        style={{ color: 'var(--brand-danger)' }}
                        title="Remove item"
                        id={`cart-remove-${item.id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="card" style={{ flex: 1, width: '100%' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Order Summary</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            <span>Taxes & Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border-subtle)', fontWeight: 700, fontSize: '1.5rem' }}>
            <span>Total</span>
            <span style={{ color: 'var(--primary-color)' }}>${calculateTotal().toFixed(2)}</span>
          </div>

          <div style={{ marginBottom: '1.5rem', background: 'var(--bg-base)', padding: '1rem', borderRadius: '0.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Contact Preference</h4>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="radio" name="contactMethod" value="email" checked={contactMethod === 'email'} onChange={(e) => setContactMethod(e.target.value)} />
                Email
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="radio" name="contactMethod" value="whatsapp" checked={contactMethod === 'whatsapp'} onChange={(e) => setContactMethod(e.target.value)} />
                WhatsApp
              </label>
            </div>
            <input 
              type={contactMethod === 'email' ? 'email' : 'tel'} 
              className="input-field" 
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem' }} 
              placeholder={contactMethod === 'email' ? 'your@email.com' : '+1 234 567 8900'} 
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
            />
          </div>

          <button 
            className="btn btn-primary"  
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginBottom: '1rem' }}
            onClick={handleCheckout}
            disabled={checkingOut}
          >
            {checkingOut ? 'Processing...' : <><CreditCard size={20} /> Secure Checkout</>}
          </button>
          
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
            onClick={() => window.print()}
          >
            <FileText size={20} /> Export Quote to PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
