import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { ArrowLeft, Check, X, Edit2, Clock, CheckCircle, Truck, FileText, Package } from 'lucide-react';
import OrderConfigurationDisplay from '../components/OrderConfigurationDisplay';

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requotePrice, setRequotePrice] = useState('');
  const [isRequoting, setIsRequoting] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';

  const fetchOrder = async () => {
    try {
      const res = await api.get('/orders/');
      const foundOrder = res.data.find(o => o.id === parseInt(id));
      if (foundOrder) {
        setOrder(foundOrder);
        setRequotePrice(foundOrder.total_price);
      } else {
        toast.error('Not Found', 'Order not found.');
        navigate('/orders');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error', 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleAdminReview = async (action) => {
    if (action === 'requote' && (!requotePrice || isNaN(requotePrice))) {
      toast.error('Invalid Price', 'Please enter a valid number for requote.');
      return;
    }

    const payload = { action };
    if (action === 'requote') payload.new_price = parseFloat(requotePrice);

    setProcessing(true);
    try {
      await api.put(`/orders/${order.id}/review`, payload);
      toast.success('Success', `Order ${action}d successfully.`);
      fetchOrder();
      setIsRequoting(false);
    } catch (e) {
      toast.error('Error', e.response?.data?.detail || 'Action failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClientAcceptRequote = async () => {
    setProcessing(true);
    try {
      await api.put(`/orders/${order.id}/accept-requote`);
      toast.success('Accepted', 'You have accepted the new quote. The order is now approved.');
      fetchOrder();
    } catch (e) {
      toast.error('Error', e.response?.data?.detail || 'Acceptance failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!isAdminRole) return;
    setProcessing(true);
    try {
      await api.put(`/orders/${order.id}/status`, { status: newStatus });
      toast.success('Status Updated', `Order status changed to ${newStatus}.`);
      fetchOrder();
    } catch (e) {
      toast.error('Error', e.response?.data?.detail || 'Update failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: '2rem' }}>Loading order details...</div>;
  }

  if (!order) return null;

  const STAGES = [
    { id: 'pending_approval', label: 'Pending Approval', icon: Clock },
    { id: 'approved', label: 'Approved', icon: CheckCircle },
    { id: 'under_manufacturing', label: 'Manufacturing', icon: FileText },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: Package }
  ];

  // Helper to map DB status to stage index
  const getStageIndex = (status) => {
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'pending_approval' || s === 'requoted' || s === 'pending_quote') return 0;
    if (s === 'approved') return 1;
    if (s === 'under manufacturing' || s === 'under_manufacturing' || s === 'manufacturing') return 2;
    if (s === 'shipped') return 3;
    if (s === 'delivered') return 4;
    return -1; // Denied or unknown
  };

  const currentStageIndex = getStageIndex(order.status);
  const isDenied = order.status.toLowerCase() === 'denied';

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn-icon" onClick={() => navigate('/orders')} style={{ background: 'var(--bg-base)', padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Order ORD-{order.id.toString().padStart(4, '0')}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="card">
        <h3 style={{ marginBottom: '2rem' }}>Order Progress</h3>
        
        {isDenied ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--brand-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '0.5rem' }}>
            <X size={32} />
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Order Denied / Cancelled</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>This order cannot proceed further.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', margin: '0 1rem' }}>
            {/* Background Line */}
            <div style={{ position: 'absolute', top: '24px', left: 0, right: 0, height: '4px', background: 'var(--bg-base)', zIndex: 0, borderRadius: '2px' }} />
            
            {/* Progress Line */}
            <div style={{ 
              position: 'absolute', top: '24px', left: 0, 
              width: `${(Math.max(0, currentStageIndex) / (STAGES.length - 1)) * 100}%`, 
              height: '4px', background: 'var(--primary-color)', zIndex: 1, borderRadius: '2px',
              transition: 'width 0.5s ease'
            }} />

            {STAGES.map((stage, idx) => {
              const isCompleted = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const Icon = stage.icon;
              
              // Only admins can click to update stages >= 1 (Approved)
              const canClickToUpdate = isAdminRole && currentStageIndex >= 1 && idx >= 1;

              return (
                <div 
                  key={stage.id} 
                  style={{ 
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: '0.75rem',
                    cursor: canClickToUpdate ? 'pointer' : 'default',
                    opacity: isCompleted ? 1 : 0.4
                  }}
                  onClick={() => {
                    if (canClickToUpdate) {
                      // Map the stage back to DB status string
                      const targetStatus = stage.id === 'under_manufacturing' ? 'under manufacturing' : stage.id;
                      handleUpdateStatus(targetStatus);
                    }
                  }}
                  title={canClickToUpdate ? `Update status to ${stage.label}` : ''}
                >
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: isCompleted ? 'var(--primary-color)' : 'var(--bg-base)',
                    color: isCompleted ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: isCurrent ? '4px solid rgba(58, 123, 213, 0.3)' : '4px solid transparent',
                    boxShadow: isCompleted ? '0 0 15px rgba(58, 123, 213, 0.4)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    <Icon size={24} />
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: isCompleted ? 700 : 500, color: isCompleted ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {stage.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* Order Info & Admin Actions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3>Order Details</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Amount</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              ${order.total_price.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>
              {order.status.replace('_', ' ')}
            </span>
          </div>

          {order.items?.[0]?.configuration?.pdf_url && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Quote Document</span>
              <a 
                href={`${import.meta.env.VITE_API_URL}${order.items[0].configuration.pdf_url}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', textDecoration: 'none' }}
              >
                <FileText size={16} /> Download PDF
              </a>
            </div>
          )}

          {isAdminRole && (
            <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Client Contact</h4>
              <div style={{ fontWeight: 600 }}>{order.contact_method === 'whatsapp' ? 'WhatsApp' : 'Email'}: {order.contact_value || 'Not provided'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>User ID: {order.user_id}</div>
            </div>
          )}

          {/* Action Area based on status */}
          <div style={{ marginTop: 'auto' }}>
            {isAdminRole && (order.status === 'pending_approval' || order.status === 'pending' || order.status === 'pending_quote') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!isRequoting ? (
                  <>
                    <button className="btn btn-primary" onClick={() => handleAdminReview('approve')} disabled={processing} style={{ padding: '0.75rem' }}>
                      <Check size={18} /> Approve Order
                    </button>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn btn-secondary" onClick={() => setIsRequoting(true)} disabled={processing} style={{ flex: 1 }}>
                        <Edit2 size={16} /> Requote Price
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleAdminReview('deny')} disabled={processing} style={{ flex: 1, color: 'var(--brand-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        <X size={16} /> Deny
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ margin: 0 }}>New Quote Amount</h4>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={requotePrice} 
                      onChange={e => setRequotePrice(e.target.value)} 
                      placeholder="e.g. 150.00"
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary" onClick={() => handleAdminReview('requote')} disabled={processing} style={{ flex: 1 }}>
                        Submit Quote
                      </button>
                      <button className="btn btn-secondary" onClick={() => setIsRequoting(false)} style={{ padding: '0.5rem' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isAdminRole && order.status === 'requoted' && (
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--brand-info)', padding: '1.25rem', borderRadius: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-info)' }}>Action Required</h4>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>The admin has requoted your order total to <strong>${order.total_price.toFixed(2)}</strong>. Please accept to proceed.</p>
                <button className="btn btn-primary" onClick={handleClientAcceptRequote} disabled={processing} style={{ width: '100%' }}>
                  <Check size={18} /> Accept New Quote
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0 }}>Items ({order.items.length})</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                    {item.configuration && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                         <OrderConfigurationDisplay configuration={item.configuration} productId={item.product_id} />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, width: '60px', textAlign: 'center' }}>x{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {order.items?.[0]?.configuration?.pdf_url && (
        <div className="card" style={{ marginTop: '2rem', overflow: 'visible' }}>
          <h3 style={{ marginBottom: '1rem' }}>Quote Document Viewer</h3>
          <object 
            data={`${import.meta.env.VITE_API_URL}${order.items[0].configuration.pdf_url}`} 
            type="application/pdf"
            style={{ width: '100%', height: '600px', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }} 
            title="Quote PDF Viewer"
          >
            <embed 
              src={`${import.meta.env.VITE_API_URL}${order.items[0].configuration.pdf_url}`} 
              type="application/pdf"
              style={{ width: '100%', height: '600px', border: 'none', borderRadius: '0.5rem' }}
            />
            <p>Your browser does not support PDFs. <a href={`${import.meta.env.VITE_API_URL}${order.items[0].configuration.pdf_url}`} target="_blank" rel="noreferrer">Download the PDF</a>.</p>
          </object>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
