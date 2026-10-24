import { useEffect, useState } from 'react';
import api from '../../services/api';

export const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
export const imageUrl = (url) => !url ? '' : /^(https?:|data:|blob:)/.test(url) ? url : `${api.defaults.baseURL}${url}`;
export const orderNumber = (id) => `ORD-${String(id).padStart(4, '0')}`;
export const statusLabel = (value) => ({ pending: 'Awaiting review', pending_approval: 'Awaiting approval', pending_quote: 'Quote requested', requoted: 'Quote ready', approved: 'Approved', 'under manufacturing': 'Manufacturing', under_manufacturing: 'Manufacturing', manufacturing: 'Manufacturing', shipped: 'Shipped', delivered: 'Delivered', denied: 'Declined', cancelled: 'Cancelled' }[value] || value?.replaceAll('_', ' ') || 'Processing');
export const isQuote = (order) => ['pending_quote', 'requoted'].includes(order.status);
export const isActiveOrder = (order) => !['delivered', 'denied', 'cancelled'].includes(order.status);

export function useCustomerStore(includeOrders = true) {
  const [state, setState] = useState({ products: [], categories: [], orders: [], loading: true, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [products, categories, orders] = await Promise.all([api.get('/products/'), api.get('/categories/'), includeOrders ? api.get('/orders/') : Promise.resolve({ data: [] })]);
        const visibleProducts = products.data.filter((product) => product.category_id == null || categories.data.some((category) => category.id === product.category_id));
        if (active) setState({ products: visibleProducts, categories: categories.data, orders: orders.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id), loading: false, error: '' });
      } catch { if (active) setState((previous) => ({ ...previous, loading: false, error: 'We couldn’t load your workspace. Please try again.' })); }
    }
    load();
    return () => { active = false; };
  }, [includeOrders, version]);
  return { ...state, retry: () => setVersion((value) => value + 1) };
}
