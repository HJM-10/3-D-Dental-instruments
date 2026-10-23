import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Boxes,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Edit3,
  ExternalLink,
  Layers,
  Minus,
  Package,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  XCircle,
  Box,
  Save,
  UploadCloud,
  X,
  Share2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import api from '../services/api';

const getAnalyticsSessionId = () => {
  const key = 'dnf_guest_session_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = window.crypto?.randomUUID?.() || `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, id);
  return id;
};

const trackProductEngagement = (productId, interactionType, startedAt, durationSeconds = 0) => {
  if (!productId) return;

  const payload = {
    product_id: productId,
    session_id: getAnalyticsSessionId(),
    interaction_type: interactionType,
    view_started_at: startedAt?.toISOString?.() || null,
    view_ended_at: new Date().toISOString(),
    duration_seconds: Math.max(0, Math.round(durationSeconds)),
  };
  const token = sessionStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  fetch(`${api.defaults.baseURL}/analytics/engagement`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Analytics should never interrupt browsing or ordering.
  });
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedConfig, setSelectedConfig] = useState({});
  const [adding, setAdding] = useState(false);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    let trackedProduct = null;
    let flushed = false;
    const startedAt = new Date();
    const startedAtMs = Date.now();

    const flushEngagement = () => {
      if (!trackedProduct || flushed) return;
      flushed = true;
      const durationSeconds = (Date.now() - startedAtMs) / 1000;
      trackProductEngagement(trackedProduct.id, 'page_view', startedAt, durationSeconds);
      if (trackedProduct.description && durationSeconds >= 3) {
        trackProductEngagement(trackedProduct.id, 'description_view', startedAt, Math.min(durationSeconds, 180));
      }
    };

    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      setActiveImage(0);
      setQuantity(1);
      setSelectedConfig({});

      try {
        const productRes = await api.get(`/products/${id}`);
        if (!mounted) return;

        trackedProduct = productRes.data;
        setProduct(productRes.data);
        setEditForm({
          name: productRes.data.name,
          description: productRes.data.description || '',
          base_price: productRes.data.base_price,
          stock_amount: productRes.data.stock_amount,
          images: productRes.data.images || []
        });

        const allProductsRes = await api.get('/products/');
        if (!mounted) return;

        const sameCategory = allProductsRes.data
          .filter((item) => item.id !== productRes.data.id && item.category_id === productRes.data.category_id)
          .slice(0, 4);
        const fallback = allProductsRes.data
          .filter((item) => item.id !== productRes.data.id)
          .slice(0, 4);

        setRelatedProducts(sameCategory.length > 0 ? sameCategory : fallback);
      } catch (e) {
        console.error(e);
        if (mounted) setError(e.response?.data?.detail || 'Unable to load this product.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProduct();
    window.addEventListener('pagehide', flushEngagement);

    return () => {
      mounted = false;
      window.removeEventListener('pagehide', flushEngagement);
      flushEngagement();
    };
  }, [id]);

  const images = useMemo(() => product?.images?.filter(Boolean) || [], [product]);
  const activeImageSrc = images[activeImage];
  const isInStock = Number(product?.stock_amount || 0) > 0;
  const maxQuantity = Math.max(Number(product?.stock_amount || 1), 1);
  const productConfigurations = product?.configurations || [];

  const handleConfigChange = (fieldName, value) => {
    setSelectedConfig((current) => ({
      ...current,
      [fieldName]: value,
    }));
  };

  const handleOpenCustomization = () => {
    if (product) {
      trackProductEngagement(product.id, 'customization_start', new Date(), 1);
      if (product.model_3d_url || product.configurable) {
        trackProductEngagement(product.id, '3d_view', new Date(), 1);
      }
      navigate(`/customize/${product.id}`);
    }
  };

  const handleAddToCart = async () => {
    if (!product || !isInStock || isAdminRole) return;

    if (!user) {
      navigate('/login', {
        state: {
          returnTo: location.pathname,
          returnState: {
            pendingCart: {
              productId: product.id,
              quantity,
              configuration: Object.keys(selectedConfig).length ? selectedConfig : null,
            },
          },
        },
      });
      return;
    }

    setAdding(true);
    try {
      await addToCart(product.id, quantity, Object.keys(selectedConfig).length ? selectedConfig : null);
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    const pendingCart = location.state?.pendingCart;
    if (!user || !product || !pendingCart || pendingCart.productId !== product.id) return;

    addToCart(pendingCart.productId, pendingCart.quantity || 1, pendingCart.configuration || null);
    navigate(location.pathname, { replace: true, state: null });
  }, [addToCart, location.pathname, location.state, navigate, product, user]);

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      setAdding(true);
      const res = await api.put(`/products/${id}`, editForm);
      setProduct(res.data);
      setEditModalOpen(false);
      toast.success('Success', 'Product updated successfully');
    } catch (err) {
      toast.error('Error', err.response?.data?.detail || 'Failed to update product');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="product-page product-page-loading">
        <div className="product-skeleton product-skeleton-media" />
        <div className="product-skeleton-stack">
          <div className="product-skeleton product-skeleton-title" />
          <div className="product-skeleton product-skeleton-line" />
          <div className="product-skeleton product-skeleton-line short" />
          <div className="product-skeleton product-skeleton-panel" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-empty-state">
        <Package size={52} />
        <h2>Product not found</h2>
        <p>{error || 'This product is unavailable or may have been removed.'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/categories')}>
          Browse catalog <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="product-page animate-fade-in">
      {editModalOpen && isAdminRole && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-panel card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} className="text-brand-primary" /> Edit Product
              </h3>
              <button className="btn-icon" onClick={() => setEditModalOpen(false)} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label>Product Name</label>
                <input required className="input-field" value={editForm.name} onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))} />
              </div>
              <div className="input-group">
                <label>Description / Overview</label>
                <textarea className="input-field" rows={4} value={editForm.description} onChange={e => setEditForm(prev => ({...prev, description: e.target.value}))} />
              </div>
              <div className="input-group">
                <label>Images</label>
                <div 
                  className="image-upload-zone" 
                  style={{ border: '2px dashed var(--glass-border-subtle)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', background: 'var(--glass-bg)', cursor: 'pointer', position: 'relative' }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (!files || files.length === 0) return;
                    setAdding(true);
                    try {
                      const newImages = [...editForm.images];
                      for (const file of files) {
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await api.post('/products/upload-image', formData);
                        if (res.data.url) newImages.push(res.data.url);
                      }
                      setEditForm(prev => ({ ...prev, images: newImages }));
                      toast.success('Upload complete', 'Images uploaded');
                    } catch (err) {
                      toast.error('Upload failed', 'Could not upload image');
                    } finally {
                      setAdding(false);
                    }
                  }}
                >
                  <UploadCloud size={32} style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Drag and drop images here, or click to select</p>
                  <input type="file" multiple accept="image/*" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    setAdding(true);
                    try {
                      const newImages = [...editForm.images];
                      for (const file of files) {
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await api.post('/products/upload-image', formData);
                        if (res.data.url) newImages.push(res.data.url);
                      }
                      setEditForm(prev => ({ ...prev, images: newImages }));
                      toast.success('Upload complete', 'Images uploaded');
                    } catch (err) {
                      toast.error('Upload failed', 'Could not upload image');
                    } finally {
                      setAdding(false);
                    }
                  }} />
                </div>
                {editForm.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    {editForm.images.map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img src={img.startsWith('http') ? img : `${api.defaults.baseURL}${img}`} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => setEditForm(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 2 }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Base Price ($)</label>
                  <input type="number" step="0.01" required className="input-field" value={editForm.base_price} onChange={e => setEditForm(prev => ({...prev, base_price: parseFloat(e.target.value)}))} />
                </div>
                <div className="input-group">
                  <label>Stock Amount (Restock)</label>
                  <input type="number" min="0" required className="input-field" value={editForm.stock_amount} onChange={e => setEditForm(prev => ({...prev, stock_amount: parseInt(e.target.value)}))} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? 'Saving...' : <><Save size={16}/> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="product-back-button" onClick={() => navigate(-1)} style={{ marginBottom: 0 }}>
          <ArrowLeft size={18} /> Back to catalog
        </button>
        {isAdminRole && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => {
              const url = window.location.origin + '/products/' + product.id;
              navigator.clipboard.writeText(url);
              toast.success('Link Copied', 'Product share link copied to clipboard.');
            }}>
              <Share2 size={16} /> Copy Share Link
            </button>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(true)}>
              <Edit3 size={16} /> Edit Product
            </button>
          </div>
        )}
      </div>

      <section className="product-hero">
        <div className="product-gallery">
          <div className="product-main-image">
            {activeImageSrc ? (
              <img src={activeImageSrc.startsWith('http') || activeImageSrc.startsWith('data:') ? activeImageSrc : `${api.defaults.baseURL}${activeImageSrc}`} alt={product.name} />
            ) : (
              <div className="product-image-fallback">
                {product.model_3d_url ? (
                  <>
                    <Box size={72} style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem' }} />
                    <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>3D Model Available</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click 'Open 3D Customization' to interact</span>
                  </>
                ) : (
                  <>
                    <Package size={72} />
                    <span>Product image pending</span>
                  </>
                )}
              </div>
            )}
            <div className={`product-stock-ribbon ${isInStock ? 'in-stock' : 'out-stock'}`}>
              {isInStock ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {isInStock ? `${product.stock_amount} in stock` : 'Out of stock'}
            </div>
          </div>

          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  className={`product-thumbnail ${activeImage === index ? 'active' : ''}`}
                  onClick={() => setActiveImage(index)}
                  type="button"
                  aria-label={`View product image ${index + 1}`}
                >
                  <img src={image.startsWith('http') || image.startsWith('data:') ? image : `${api.defaults.baseURL}${image}`} alt={`${product.name} view ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-summary">
          <div className="product-kicker">
            <span><Tag size={15} /> {product.sku || `PRODUCT-${product.id}`}</span>
            {product.configurable && <span><Ruler size={15} /> Configurable</span>}
          </div>

          <h1>{product.name}</h1>

          <p className="product-lead">
            {product.description || 'A precision product from the DNF Trading catalog, ready for clinical and operational workflows.'}
          </p>

          <div className="product-price-row">
            <div>
              <span className="product-price-label">Unit price</span>
              <strong>${Number(product.base_price || 0).toFixed(2)}</strong>
            </div>
            <div className={`product-availability ${isInStock ? 'available' : 'unavailable'}`}>
              {isInStock ? <CheckCircle size={18} /> : <XCircle size={18} />}
              {isInStock ? 'Available now' : 'Restock required'}
            </div>
          </div>

          {productConfigurations.length > 0 && (
            <div className="product-configurator">
              <div className="product-section-title">
                <Layers size={18} />
                Product options
              </div>

              <div className="product-config-grid">
                {productConfigurations.map((config) => (
                  <label key={config.id} className="product-config-field">
                    <span>{config.field_name}</span>
                    {config.field_type === 'dropdown' && config.options?.length ? (
                      <select
                        className="input-field"
                        value={selectedConfig[config.field_name] || ''}
                        onChange={(e) => handleConfigChange(config.field_name, e.target.value)}
                      >
                        <option value="">Select {config.field_name}</option>
                        {config.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input-field"
                        type={config.field_type === 'number' ? 'number' : 'text'}
                        value={selectedConfig[config.field_name] || ''}
                        onChange={(e) => handleConfigChange(config.field_name, e.target.value)}
                        placeholder={`Enter ${config.field_name}`}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="product-actions">
            {!isAdminRole && (
              <div className="product-purchase-row">
                <div className="quantity-control" aria-label="Quantity">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    title="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                    disabled={!isInStock || quantity >= maxQuantity}
                    title="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  className="btn btn-primary product-primary-action"
                  onClick={handleAddToCart}
                  disabled={!isInStock || adding}
                >
                  <ShoppingCart size={20} />
                  {adding ? 'Adding...' : isInStock ? 'Add to cart' : 'Out of stock'}
                </button>
              </div>
            )}

            <button
              className="btn btn-secondary product-secondary-action"
              onClick={handleOpenCustomization}
            >
              <Edit3 size={18} /> Open 3D customization
            </button>

            {product.model_3d_url && isAdminRole && (
              <a
                className="btn btn-secondary product-secondary-action"
                href={product.model_3d_url?.startsWith(`http`) ? product.model_3d_url : `${api.defaults.baseURL}${product.model_3d_url}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackProductEngagement(product.id, '3d_view', new Date(), 1)}
              >
                <ExternalLink size={18} /> View model source
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="product-info-grid">
        <div className="product-info-panel">
          <div className="product-section-title">
            <ClipboardList size={18} />
            Product overview
          </div>
          <p>{product.description || 'No additional description has been added yet.'}</p>
        </div>

        <div className="product-info-panel">
          <div className="product-section-title">
            <Boxes size={18} />
            Inventory details
          </div>
          <dl className="product-spec-list">
            <div>
              <dt>SKU</dt>
              <dd>{product.sku || 'Not assigned'}</dd>
            </div>
            <div>
              <dt>Category ID</dt>
              <dd>{product.category_id || 'Uncategorized'}</dd>
            </div>
            <div>
              <dt>Stock</dt>
              <dd>{product.stock_amount}</dd>
            </div>
            <div>
              <dt>Configurations</dt>
              <dd>{productConfigurations.length || 'None'}</dd>
            </div>
          </dl>
        </div>


      </section>

      {relatedProducts.length > 0 && (
        <section className="product-related-section">
          <div className="product-related-header">
            <div>
              <h2>Related products</h2>
              <p>Keep exploring products from this catalog.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/categories')}>
              Browse all <ChevronRight size={18} />
            </button>
          </div>

          <div className="product-related-grid">
            {relatedProducts.map((item) => (
              <button
                key={item.id}
                className="product-related-card"
                onClick={() => navigate(`/products/${item.id}`)}
                type="button"
              >
                <div className="product-related-image">
                  {item.images?.[0] ? <img src={item.images[0].startsWith('http') || item.images[0].startsWith('data:') ? item.images[0] : `${api.defaults.baseURL}${item.images[0]}`} alt={item.name} /> : <Package size={34} />}
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.sku || `PRODUCT-${item.id}`}</p>
                  <strong>${Number(item.base_price || 0).toFixed(2)}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetails;
