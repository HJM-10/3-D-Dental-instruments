import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Box, Package, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const catRes = await api.get('/categories/');
      const prodRes = await api.get('/products/');
      setCategories(catRes.data.slice(0, 3)); // top 3
      setProducts(prodRes.data.slice(0, 4)); // top 4
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '2rem' }}>
      
      {/* Welcome Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-glow) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--primary-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {isAdminRole ? (user?.role === 'super_admin' ? 'Super Admin Control Center' : 'Admin Control Center') : 'Welcome to DNF Trading'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {isAdminRole
              ? 'Manage your platform, users, and track live analytics.' 
              : 'Discover premium surgical instruments and dental equipment.'}
          </p>
        </div>
        {isAdminRole && (
          <button className="btn btn-primary" onClick={() => navigate('/analytics')}>
            View Full Analytics <ArrowRight size={16} />
          </button>
        )}
      </div>

      {/* Featured Categories */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Featured Categories</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/categories')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            View All <ArrowRight size={16} />
          </button>
        </div>
        <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '1.5rem', paddingBottom: '1rem', scrollSnapType: 'x mandatory' }}>
          {categories.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No categories added yet.</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="card group cursor-pointer" onClick={() => navigate('/categories')} style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: '280px', flex: '0 0 auto', scrollSnapAlign: 'start', minHeight: '300px' }}>
                <div style={{ 
                  height: '180px', 
                  background: cat.image ? `url(${cat.image}) center/cover` : 'var(--bg-base)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  {!cat.image && <Box size={40} style={{ color: 'var(--primary-color)', opacity: 0.5 }} />}
                </div>
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>{cat.name}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cat.description || 'View products in this category'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Trending Products */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Trending Instruments</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/categories')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Browse Catalog <ArrowRight size={16} />
          </button>
        </div>
        <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '1.5rem', paddingBottom: '1rem', scrollSnapType: 'x mandatory' }}>
          {products.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No products added yet.</p>
          ) : (
            products.map(prod => (
              <div key={prod.id} className="card group cursor-pointer" onClick={() => navigate(`/products/${prod.id}`)} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', cursor: 'pointer', minWidth: '280px', flex: '0 0 auto', scrollSnapAlign: 'start', minHeight: '380px' }}>
                <div style={{ 
                  background: 'var(--bg-base)', 
                  borderRadius: '0.5rem', 
                  height: '200px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '1rem',
                  overflow: 'hidden'
                }}>
                  {prod.images && prod.images.length > 0 ? (
                    <img src={prod.images[0].startsWith('http') || prod.images[0].startsWith('data:') ? prod.images[0] : `${api.defaults.baseURL}${prod.images[0]}`} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={48} style={{ color: 'var(--primary-color)', opacity: 0.5 }} />
                  )}
                </div>
                <h4 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{prod.name}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', flex: 1 }}>{prod.description || 'Premium Instrument'}</p>
                <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.25rem', marginTop: 'auto' }}>
                  ${prod.base_price.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
