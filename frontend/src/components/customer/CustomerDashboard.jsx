import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, Check, FileText, Layers, Package, ShoppingBag, ShoppingCart, SlidersHorizontal, Truck } from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import CustomerProductCard from './CustomerProductCard';
import { isActiveOrder, isQuote, money, orderNumber, statusLabel, useCustomerStore } from './store';

function LatestOrder({ order }) {
  const stages = ['Submitted', 'Approved', 'Manufacturing', 'Shipped', 'Delivered'];
  const stage = { approved: 1, 'under manufacturing': 2, under_manufacturing: 2, manufacturing: 2, shipped: 3, delivered: 4 }[order?.status] || 0;
  return <section className="customer-panel customer-latest-order"><div className="customer-panel-title"><h2>Latest order</h2><Link to="/orders">View all <ArrowRight size={13} /></Link></div>{order ? <>
    <div className="customer-order-number"><strong>{orderNumber(order.id)}</strong><span className="customer-status"><Truck size={13} />{statusLabel(order.status)}</span></div>
    <p className="customer-order-meta">Placed {new Date(order.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })} · {money(order.total_price)}</p>
    {['denied', 'cancelled'].includes(order.status) ? <p className="customer-order-meta">This request has been {statusLabel(order.status).toLowerCase()}. Open the order for details.</p> : <ol className="customer-progress" aria-label={`Order progress: ${statusLabel(order.status)}`}>{stages.map((label, index) => <li key={label} className={index <= stage ? 'complete' : ''}><span>{index <= stage ? <Check size={12} /> : ''}</span><small>{label}</small></li>)}</ol>}
    <Link className="customer-outline-link" to={`/orders/${order.id}`}><Truck size={15} />View order progress</Link>
  </> : <div className="customer-small-empty"><Package size={29} /><h3>Your first order starts here</h3><p>Explore instruments and build something that works for you.</p><Link to="/categories">Explore instruments <ArrowRight size={14} /></Link></div>}</section>;
}

export default function CustomerDashboard() {
  const { products, categories, orders, loading, error, retry } = useCustomerStore();
  const { cart } = useContext(CartContext);
  const [category, setCategory] = useState('all');
  const customizable = products.find((item) => item.configurable && item.stock_amount > 0);
  const kitLink = customizable ? `/customize/${customizable.id}` : '/categories?customizable=true';
  const readyQuotes = orders.filter((order) => order.status === 'requoted');
  const quote = readyQuotes[0] || orders.find(isQuote);
  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const filtered = products.filter((item) => category === 'all' || item.category_id === category);
  const featured = [...filtered].sort((a, b) => (b.stock_amount > 0) - (a.stock_amount > 0)).slice(0, 3);
  if (loading) return <div className="customer-loading" role="status"><div className="customer-loading-shimmer" />Getting your workspace ready…</div>;
  if (error) return <div className="customer-error" role="alert"><h2>A moment to reconnect</h2><p>{error}</p><button className="btn btn-primary" onClick={retry}>Try again</button></div>;
  return <div className="customer-dashboard">
    <header className="customer-page-heading"><span className="customer-eyebrow">YOUR INSTRUMENT WORKSPACE</span><h1>Everything for your next great kit<span>.</span></h1><p>Browse instruments, explore configurations, and keep your orders moving.</p></header>
    <div className="customer-dashboard-grid"><div className="customer-dashboard-primary">
      <section className="customer-hero"><img src="/images/customer-instruments.png" alt="Illustrative stainless-steel dental mirror, probe, tweezers and forceps" className="customer-hero-art" /><div className="customer-hero-copy"><span>BUILT AROUND YOUR PRACTICE</span><h2>Your tools.<br />Your way.</h2><p>Find your next essential.<br />Make your kit your own.</p><div><Link className="btn btn-primary" to={kitLink}>Build a kit <ArrowRight size={16} /></Link><Link className="btn btn-secondary" to="/categories">Browse instruments</Link></div></div><span className="customer-hero-note">Illustrative instrument imagery</span></section>
      <div className="customer-quick-links"><Link to="/orders"><span><ShoppingBag size={19} /></span><div><strong>{orders.filter(isActiveOrder).length} active orders</strong><small>Keep every step in sight</small></div><ArrowRight size={15} /></Link><Link to="/quotes"><span><FileText size={19} /></span><div><strong>{readyQuotes.length} {readyQuotes.length === 1 ? 'quote' : 'quotes'} to review</strong><small>Your next kit is one step closer</small></div><ArrowRight size={15} /></Link><Link to="/cart"><span><Layers size={19} /></span><div><strong>{cartCount} {cartCount === 1 ? 'instrument' : 'instruments'} in your cart</strong><small>Pick up where you left off</small></div><ArrowRight size={15} /></Link></div>
    </div><aside className="customer-dashboard-aside"><LatestOrder order={orders[0]} /><section className="customer-panel customer-quote-card"><span className="customer-quote-icon"><FileText size={23} /></span><div><h2>{quote?.status === 'requoted' ? 'A quote is ready' : quote ? 'Your quote is in progress' : 'Make it your own'}</h2><p>{quote ? `${orderNumber(quote.id)} · ${money(quote.total_price)}` : 'Explore configurable instruments for your next kit.'}</p><Link to={quote ? `/orders/${quote.id}` : kitLink}>{quote?.status === 'requoted' ? 'Review quote' : quote ? 'View request' : 'Explore customization'} <ArrowRight size={15} /></Link></div></section></aside></div>
    <section className="customer-featured"><div className="customer-section-heading"><h2>Explore instruments</h2><Link to="/categories">View all instruments <ArrowRight size={16} /></Link></div><div className="customer-filter-tabs" aria-label="Filter featured instruments"><button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All instruments</button>{categories.map((item) => <button key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div>{featured.length ? <div className="customer-product-grid">{featured.map((product) => <CustomerProductCard key={product.id} product={product} category={categories.find((item) => item.id === product.category_id)} />)}</div> : <div className="customer-empty"><Box size={35} /><h3>Your collection is coming together</h3><p>Instruments will appear here as they’re added to the catalog.</p></div>}</section>
    <section className="customer-continue-card"><span className="customer-continue-icon">{cartCount ? <ShoppingCart size={29} /> : <SlidersHorizontal size={29} />}</span><div><h2>{cartCount ? 'Your next kit is taking shape' : 'A kit that fits the way you work'}</h2><p>{cartCount ? `${cartCount} instruments in your cart · Review your selection whenever you’re ready.` : 'Explore configurable instruments and build your next setup.'}</p></div><Link className="btn btn-primary" to={cartCount ? '/cart' : kitLink}>{cartCount ? 'Continue to cart' : 'Start customizing'} <ArrowRight size={16} /></Link></section>
  </div>;
}
