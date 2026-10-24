import { useSearchParams } from 'react-router-dom';
import { Box, Search, SlidersHorizontal, X } from 'lucide-react';
import CustomerProductCard from './CustomerProductCard';
import { useCustomerStore } from './store';

export default function CustomerCatalog() {
  const { products, categories, loading, error, retry } = useCustomerStore(false);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const category = params.get('category') || 'all';
  const customOnly = params.get('customizable') === 'true';
  const sort = params.get('sort') || 'featured';
  const update = (key, value) => setParams((previous) => { const next = new URLSearchParams(previous); if (!value || value === 'all' || value === 'featured') next.delete(key); else next.set(key, value); return next; }, { replace: true });
  const filtered = products.filter((product) => (category === 'all' || String(product.category_id) === category) && (!customOnly || product.configurable) && `${product.name} ${product.sku || ''} ${product.description || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (sort === 'price-low') filtered.sort((a, b) => a.base_price - b.base_price);
  if (sort === 'price-high') filtered.sort((a, b) => b.base_price - a.base_price);
  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  return <div className="customer-catalog"><header className="customer-page-heading"><span className="customer-eyebrow">EXPLORE YOUR NEXT ESSENTIAL</span><h1>Instruments for your practice<span>.</span></h1><p>Find a familiar essential or the starting point for your next custom kit.</p></header><div className="customer-catalog-toolbar"><label className="customer-catalog-search"><Search size={18} /><input aria-label="Filter catalog" placeholder="Search by instrument or SKU" value={query} onChange={(event) => update('q', event.target.value)} />{query && <button aria-label="Clear catalog search" onClick={() => update('q', '')}><X size={16} /></button>}</label><label className="customer-sort"><SlidersHorizontal size={16} /><select aria-label="Sort instruments" value={sort} onChange={(event) => update('sort', event.target.value)}><option value="featured">Featured</option><option value="name">Name A–Z</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div><div className="customer-filter-tabs"><button aria-pressed={category === 'all'} onClick={() => update('category', 'all')}>All instruments</button>{categories.map((item) => <button key={item.id} aria-pressed={category === String(item.id)} onClick={() => update('category', String(item.id))}>{item.name}</button>)}</div><div className="customer-catalog-count"><span>{filtered.length} {filtered.length === 1 ? 'instrument' : 'instruments'}</span><label><input type="checkbox" checked={customOnly} onChange={(event) => update('customizable', event.target.checked ? 'true' : '')} />Customizable only</label></div>{loading ? <p role="status" className="customer-loading">Loading your collection…</p> : error ? <div role="alert" className="customer-error"><p>{error}</p><button className="btn btn-primary" onClick={retry}>Try again</button></div> : filtered.length ? <div className="customer-product-grid customer-catalog-grid">{filtered.map((product) => <CustomerProductCard key={product.id} product={product} category={categories.find((item) => item.id === product.category_id)} />)}</div> : <div className="customer-empty"><Box size={37} /><h2>No instruments found</h2><p>Try a different search or clear your filters.</p><button className="btn btn-secondary" onClick={() => setParams({})}>Clear filters</button></div>}</div>;
}
