import { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import api from '../services/api';
import { Plus, Package, Box, ShoppingCart, Image as ImageIcon, ChevronLeft, ChevronRight, X, Edit3, Trash2, Lock, Unlock } from 'lucide-react';

const Categories = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [uncategorized, setUncategorized] = useState([]);
  
  const [selectedCategory, setSelectedCategory] = useState(null); // null means showing all products
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Category Modal State
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState(null);
  const [newCatPrivate, setNewCatPrivate] = useState(false);
  const [selectedUncategorized, setSelectedUncategorized] = useState([]);

  // Product Modal State
  const [showProdModal, setShowProdModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('0');
  const [prodCatId, setProdCatId] = useState('');
  const [prod3DModel, setProd3DModel] = useState('');
  const [prodImages, setProdImages] = useState([]); // Array of base64 strings

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/');
      setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/');
      setProducts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadCatalog = async () => {
      try {
        const [catRes, prodRes, uncategorizedRes] = await Promise.all([
          api.get('/categories/'),
          api.get('/products/'),
          api.get('/products/uncategorized'),
        ]);

        if (!mounted) return;
        setCategories(catRes.data);
        setProducts(prodRes.data);
        setUncategorized(uncategorizedRes.data);
      } catch (e) {
        console.error(e);
      }
    };

    loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const pendingCart = location.state?.pendingCart;
    if (!user || !pendingCart) return;

    addToCart(pendingCart.productId, pendingCart.quantity || 1, pendingCart.configuration || null);
    navigate(location.pathname, { replace: true, state: null });
  }, [addToCart, location.pathname, location.state, navigate, user]);

  const handleAddToCart = (productId) => {
    if (!user) {
      navigate('/login', {
        state: {
          returnTo: location.pathname,
          returnState: { pendingCart: { productId, quantity: 1 } },
        },
      });
      return;
    }

    addToCart(productId, 1);
  };

  const fetchUncategorized = async () => {
    try {
      const res = await api.get('/products/uncategorized');
      setUncategorized(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const clearCategorySelection = () => {
    setSelectedCategory(null);
    setCurrentPage(1);
  };

  // Base64 Converters
  const handleCatImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewCatImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleProdImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    const allowed = files.slice(0, 10 - prodImages.length);
    allowed.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProdImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit Handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCatId) {
        await api.put(`/categories/${editingCatId}`, {
          name: newCatName, 
          description: newCatDesc,
          image: newCatImage,
          is_private: newCatPrivate
        });
      } else {
        await api.post('/categories/', { 
          name: newCatName, 
          description: newCatDesc,
          image: newCatImage,
          product_ids: selectedUncategorized,
          is_private: newCatPrivate
        });
      }
      setShowCatModal(false);
      setEditingCatId(null);
      setNewCatName('');
      setNewCatDesc('');
      setNewCatImage(null);
      setNewCatPrivate(false);
      setSelectedUncategorized([]);
      fetchCategories();
      fetchProducts();
      if (!editingCatId) fetchUncategorized();
    } catch {
      alert("Error saving category");
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || '');
    setNewCatImage(cat.image || null);
    setNewCatPrivate(cat.is_private || false);
    setShowCatModal(true);
  };

  const handleDeleteCategory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this category? Products inside will become uncategorized.")) return;
    try {
      await api.delete(`/categories/${id}`);
      if (selectedCategory?.id === id) clearCategorySelection();
      fetchCategories();
      fetchProducts();
      fetchUncategorized();
    } catch {
      alert("Error deleting category");
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products/', {
        name: prodName,
        sku: prodSku || null,
        description: prodDesc,
        base_price: parseFloat(prodPrice),
        stock_amount: parseInt(prodStock),
        category_id: prodCatId ? parseInt(prodCatId) : null,
        images: prodImages,
        model_3d_url: prod3DModel || null,
        configurable: false
      });
      setShowProdModal(false);
      // Reset form
      setProdName(''); setProdSku(''); setProdDesc(''); setProdPrice(''); 
      setProdStock('0'); setProdCatId(''); setProd3DModel(''); setProdImages([]);
      
      fetchProducts();
      fetchUncategorized();
    } catch {
      alert("Error adding product");
    }
  };

  // Derived Data
  const displayedProducts = selectedCategory 
    ? products.filter(p => p.category_id === selectedCategory.id)
    : products;

  const totalPages = Math.ceil(displayedProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = displayedProducts.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '2rem', paddingBottom: '4rem' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>Catalog</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <span style={{ cursor: 'pointer' }} onClick={clearCategorySelection}>All Categories</span>
            {selectedCategory && (
              <>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--primary-color)' }}>{selectedCategory.name}</span>
              </>
            )}
          </div>
        </div>
        
        {isAdminRole && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => {
              setEditingCatId(null);
              setNewCatName('');
              setNewCatDesc('');
              setNewCatImage(null);
              setNewCatPrivate(false);
              setShowCatModal(true);
            }}>
              <Plus size={18} /> New Category
            </button>
            <button className="btn btn-primary" onClick={() => setShowProdModal(true)}>
              <Plus size={18} /> New Product
            </button>
          </div>
        )}
      </div>

      {/* CATEGORIES STRIP (Top 1-2 Rows) */}
      {!selectedCategory && (
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Browse by Category</h3>
          <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '1rem', paddingBottom: '1rem', scrollSnapType: 'x mandatory' }}>
            {categories.map(cat => (
              <div key={cat.id} className="card group" onClick={() => handleCategoryClick(cat)} style={{ cursor: 'pointer', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s ease', minWidth: '240px', flex: '0 0 auto', scrollSnapAlign: 'start' }}>
                <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: cat.image ? `url(${cat.image}) center/cover` : 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', flexShrink: 0 }}>
                  {!cat.image && <Box size={20} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 600, fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {cat.name} 
                    {cat.is_private && <Lock size={12} style={{ color: 'var(--text-muted)' }} />}
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{cat.description || 'No description'}</p>
                </div>
                {isAdminRole && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                      <Edit3 size={16} />
                    </button>
                    <button onClick={(e) => handleDeleteCategory(cat.id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCTS LIST */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
            {selectedCategory ? `${selectedCategory.name} Products` : 'All Products'}
          </h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Showing {currentProducts.length} of {displayedProducts.length}
          </div>
        </div>

        {displayedProducts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Package size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>No products found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {currentProducts.map(product => (
              <div key={product.id} className="card group cursor-pointer" onClick={() => navigate(`/products/${product.id}`)} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', cursor: 'pointer' }}>
                {/* Product Image */}
                <div style={{ 
                  background: 'var(--bg-base)', 
                  borderRadius: '0.5rem', 
                  height: '200px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '1rem',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0].startsWith('http') || product.images[0].startsWith('data:') ? product.images[0] : `${api.defaults.baseURL}${product.images[0]}`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={48} style={{ color: 'var(--primary-color)', opacity: 0.5 }} />
                  )}
                  {product.stock_amount > 0 ? (
                    <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 600 }}>In Stock: {product.stock_amount}</span>
                  ) : (
                    <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 600 }}>Out of Stock</span>
                  )}
                </div>
                
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', fontWeight: 600 }}>{product.name}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '0.5rem' }}>SKU: {product.sku || 'N/A'}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-color)' }}>${product.base_price.toFixed(2)}</span>
                  {!isAdminRole && (
                    <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleAddToCart(product.id); }} style={{ padding: '0.5rem 1rem' }}>
                      <ShoppingCart size={16} /> Add
                    </button>
                  )}
                </div>
                
                <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/customize/${product.id}`); }} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  <Edit3 size={16} /> 3D Customize
                </button>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '3rem', gap: '1rem' }}>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ padding: '0.5rem' }}
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Page <strong style={{ color: 'var(--text-main)' }}>{currentPage}</strong> of {totalPages}
            </span>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)}
              style={{ padding: '0.5rem' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* --- ADD CATEGORY MODAL --- */}
      {showCatModal && (
        <div className="modal-backdrop">
          <div className="card modal-panel" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>New Category</h3>
              <button onClick={() => setShowCatModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label>Category Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '0.5rem', background: newCatImage ? `url(${newCatImage}) center/cover` : 'var(--bg-base)', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!newCatImage && <ImageIcon size={20} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <input type="file" accept="image/*" onChange={handleCatImageUpload} style={{ flex: 1, color: 'var(--text-muted)', fontSize: '0.875rem' }} />
                </div>
              </div>
              
              <div className="input-group">
                <label>Name</label>
                <input type="text" className="input-field" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              </div>
              
              <div className="input-group">
                <label>Description</label>
                <textarea className="input-field" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} rows={3} />
              </div>
              
              <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="cat-private" checked={newCatPrivate} onChange={e => setNewCatPrivate(e.target.checked)} />
                <label htmlFor="cat-private" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {newCatPrivate ? <Lock size={14} /> : <Unlock size={14} />}
                  Private Category (Only admins can see this)
                </label>
              </div>

              {!editingCatId && uncategorized.length > 0 && (
                <div className="input-group" style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '0.5rem' }}>
                  <label style={{ marginBottom: '0.5rem' }}>Assign Uncategorized Products</label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Select products that currently have no category to move them here instantly.</p>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {uncategorized.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedUncategorized.includes(p.id)}
                          onChange={(e) => {
                            if(e.target.checked) setSelectedUncategorized([...selectedUncategorized, p.id]);
                            else setSelectedUncategorized(selectedUncategorized.filter(id => id !== p.id));
                          }}
                        />
                        {p.name} <span style={{ color: 'var(--primary-color)' }}>(${p.base_price})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                {editingCatId ? 'Save Changes' : 'Create Category'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD PRODUCT MODAL --- */}
      {showProdModal && (
        <div className="modal-backdrop">
          <div className="card modal-panel" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>New Product</h3>
              <button onClick={() => setShowProdModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="input-group">
                <label>Product Images (Up to 10)</label>
                <input type="file" accept="image/*" multiple onChange={handleProdImagesUpload} disabled={prodImages.length >= 10} style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }} />
                {prodImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {prodImages.map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '0.25rem', overflow: 'hidden' }}>
                        <img src={img} alt={`upload-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => setProdImages(prodImages.filter((_, index) => index !== i))} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '0.1rem', cursor: 'pointer', fontSize: '0.6rem' }}>X</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" className="input-field" value={prodName} onChange={e => setProdName(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>SKU / ID</label>
                  <input type="text" className="input-field" value={prodSku} onChange={e => setProdSku(e.target.value)} placeholder="PROD-001" />
                </div>
              </div>

              <div className="input-group">
                <label>Description</label>
                <textarea className="input-field" value={prodDesc} onChange={e => setProdDesc(e.target.value)} rows={3} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Price ($) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" step="0.01" className="input-field" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Stock Amount</label>
                  <input type="number" className="input-field" value={prodStock} onChange={e => setProdStock(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Category</label>
                  <select className="input-field" value={prodCatId} onChange={e => setProdCatId(e.target.value)}>
                    <option value="">No Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>3D Model Architecture URL</label>
                  <input type="text" className="input-field" value={prod3DModel} onChange={e => setProd3DModel(e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Publish Product</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Categories;
