import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Box, ShoppingCart } from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { imageUrl, money } from './store';

export default function CustomerProductCard({ product, category }) {
  const { cart, fetchCart } = useContext(CartContext);
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const inCart = (cart?.items || []).filter((item) => item.product_id === product.id).reduce((sum, item) => sum + item.quantity, 0);
  const available = product.stock_amount > inCart;
  async function add() {
    setAdding(true);
    try {
      await api.post('/cart/add', { product_id: product.id, quantity: 1, configuration: null });
      await fetchCart();
      toast.success('Added to your cart', product.name);
    } catch { toast.error('Couldn’t add instrument', 'Please try again.'); }
    finally { setAdding(false); }
  }
  return <article className="customer-product-card">
    <Link className="customer-product-image" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
      {product.images?.[0] && !imageFailed ? <img src={imageUrl(product.images[0])} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} /> : <Box size={46} strokeWidth={1} />}
      {product.configurable && <span className="customer-image-badge">Customizable</span>}
      <span className="customer-image-arrow"><ArrowUpRight size={17} /></span>
    </Link>
    <div className="customer-product-info"><span className="customer-product-category">{category?.name || 'Instruments'}</span><Link to={`/products/${product.id}`}><h3>{product.name}</h3></Link><p>{product.sku || 'Explore instrument details'}</p><div className="customer-product-bottom"><strong>{money(product.base_price)}</strong><button className="customer-add-button" onClick={add} disabled={adding || !available} aria-label={`Add ${product.name} to cart`}><ShoppingCart size={15} />{adding ? 'Adding…' : available ? 'Add to cart' : product.stock_amount ? 'In your cart' : 'Out of stock'}</button></div></div>
  </article>;
}
