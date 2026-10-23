import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Box, CalendarDays, CheckCircle2, Clock3, Eye, Package, RefreshCw, ShoppingBag, SlidersHorizontal, Users } from 'lucide-react';
import api from '../services/api';

const count = (value) => Number(value || 0).toLocaleString();
const duration = (value) => {
  const seconds = Math.round(Number(value || 0));
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
};
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

function Empty({ icon: Icon = Box, title, text, children }) {
  return <div className="admin-empty"><span><Icon size={25} strokeWidth={1.5} /></span><strong>{title}</strong><p>{text}</p>{children}</div>;
}

function OrderChart({ data, days }) {
  const series = data.slice(-days);
  if (!series.some((item) => item.orders)) return <Empty icon={Activity} title="Your next chapter starts here" text="Orders will bring this chart to life. Your daily order activity will appear here." />;
  const peak = Math.max(...series.map((item) => item.orders), 1);
  const points = series.map((item, index) => `${30 + index * 640 / Math.max(series.length - 1, 1)},${190 - item.orders / peak * 155}`).join(' ');
  return <div className="admin-order-chart"><svg viewBox="0 0 700 220" role="img" aria-label={`Daily order counts over the last ${days} days`}>
    <defs><linearGradient id="order-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="currentColor" stopOpacity="0.2" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
    {[0, 1, 2, 3].map((line) => <g key={line}><line x1="30" y1={35 + line * 155 / 3} x2="670" y2={35 + line * 155 / 3} /><text x="5" y={39 + line * 155 / 3}>{Math.round(peak * (1 - line / 3))}</text></g>)}
    <polygon points={`30,190 ${points} 670,190`} fill="url(#order-fill)" />
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    {series.map((item, index) => <circle key={item.date} cx={30 + index * 640 / Math.max(series.length - 1, 1)} cy={190 - item.orders / peak * 155} r="3" fill="currentColor"><title>{item.date}: {item.orders} orders</title></circle>)}
  </svg><div className="admin-chart-axis"><span>{series[0]?.date}</span><span>{series.at(-1)?.date}</span></div></div>;
}

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);
  const [engagement, setEngagement] = useState('browsing');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get('/analytics/dashboard');
        if (active) { setData(response.data); setError(''); }
      } catch { if (active) setError('We couldn’t load your dashboard. Please try again.'); }
    }
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try { const response = await api.get('/analytics/dashboard'); setData(response.data); setError(''); }
    catch { setError('We couldn’t refresh your dashboard. Please try again.'); }
    finally { setRefreshing(false); }
  };
  const pending = (data?.order_status_breakdown || []).filter((item) => ['pending', 'pending_approval', 'pending_quote', 'requoted'].includes(item.status)).reduce((sum, item) => sum + item.count, 0);
  const rows = data?.product_engagement_table || [];
  const browsing = rows.reduce((sum, row) => sum + Number(row.total_duration_seconds || 0), 0);
  const custom = data?.customization_summary || {};
  const timeKey = engagement === 'browsing' ? 'total_duration_seconds' : 'customization_seconds';
  const ranked = [...rows].filter((row) => Number(row[timeKey]) > 0).sort((a, b) => b[timeKey] - a[timeKey]).slice(0, 4);
  const maxTime = Math.max(...ranked.map((row) => row[timeKey]), 1);

  return <div className="admin-overview">
    <header className="admin-page-heading"><div><span className="admin-eyebrow">YOUR WORKSPACE, AT A GLANCE</span><h1>Business overview<span>.</span></h1><p>A little clarity for everything you’re building.</p></div><div className="admin-heading-actions"><span className="admin-date"><CalendarDays size={16} />{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date())}</span><button className="admin-icon-button" aria-label="Refresh dashboard" onClick={refresh} disabled={refreshing}><RefreshCw size={17} className={refreshing ? 'admin-spin' : ''} /></button><Link to="/analytics" className="btn btn-primary">Full analytics <ArrowUpRight size={16} /></Link></div></header>
    {error && <div className="admin-error" role="alert">{error}<button onClick={refresh} disabled={refreshing}>Try again</button></div>}
    {!data ? <div className="admin-loading" role="status">{error ? 'Dashboard data is unavailable.' : 'Preparing your workspace…'}</div> : <>
      <section className="admin-kpis" aria-label="Business summary">
        {[
          { label: 'Total customers', value: count(data.total_customers), detail: 'Registered customer accounts', icon: Users, featured: true },
          { label: 'Orders placed', value: count(data.total_orders), detail: 'Across all order stages', icon: ShoppingBag },
          { label: 'Needs your attention', value: count(pending), detail: 'Orders and quotes awaiting review', icon: Clock3 },
          { label: 'Avg. browsing time', value: duration(data.avg_product_view_seconds), detail: 'Per recorded product view', icon: Eye },
        ].map(({ label, value, detail, icon: Icon, featured }) => <article key={label} className={`admin-kpi ${featured ? 'featured' : ''}`}><div><span>{label}</span><Icon size={19} strokeWidth={1.6} /></div><strong>{value}</strong><p>{detail}</p></article>)}
      </section>
      <div className="admin-main-grid">
        <section className="admin-panel admin-activity"><div className="admin-panel-heading"><div><h2>Order activity</h2><p>A daily view of the orders coming your way.</p></div><div className="admin-segment" aria-label="Order chart period">{[7, 30].map((period) => <button key={period} aria-pressed={days === period} onClick={() => setDays(period)}>{period} days</button>)}</div></div><OrderChart data={data.revenue_trend || []} days={days} /><div className="admin-chart-footer"><span><i /> Orders placed</span><span>Last {days} days · hover a point for details</span></div></section>
        <section className="admin-time-card"><div className="admin-time-title"><Clock3 size={21} /><span>Customer time insights</span><ArrowDownLeft size={20} /></div><span className="admin-time-label">Total customization time</span><strong className="admin-time-value">{duration(custom.customization_seconds)}</strong><p>Time customers spend making a kit their own.</p><div className="admin-time-breakdown"><div><span>Product browsing</span><strong>{duration(browsing)}</strong></div><div><span>3D exploration</span><strong>{duration(custom.model_3d_seconds)}</strong></div></div><Link to="/analytics">Explore customer insights <ArrowRight size={16} /></Link><small>All-time recorded durations. Browsing, 3D and customization may overlap.</small></section>
      </div>
      <div className="admin-detail-grid">
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Instrument engagement</h2><p>Where your customers spend their time.</p></div><SlidersHorizontal size={18} /></div><div className="admin-segment admin-engagement-tabs">{['browsing', 'customization'].map((value) => <button key={value} aria-pressed={engagement === value} onClick={() => setEngagement(value)}>{value === 'browsing' ? 'Browsing' : 'Customization'}</button>)}</div>{ranked.length ? <div className="admin-rank-list">{ranked.map((row) => <Link key={row.product_id} to={`/products/${row.product_id}`}><div><span className="admin-product-icon"><Package size={18} /></span><span><strong>{row.name}</strong><small>{count(row.total_views)} product views</small></span><b>{duration(row[timeKey])}</b></div><div className="admin-meter"><span style={{ width: `${row[timeKey] / maxTime * 100}%` }} /></div></Link>)}</div> : <Empty icon={Eye} title="Make room for discovery" text={`Recorded ${engagement} time will appear as customers explore your instruments.`} />}</section>
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>A little direction</h2><p>Your next steps, all in one place.</p></div><CheckCircle2 size={19} /></div><div className="admin-action-list"><Link to="/orders"><span className="admin-action-icon"><ShoppingBag size={19} /></span><span><strong>Review orders & quotes</strong><small>{pending ? `${pending} waiting for your attention` : 'You’re all caught up'}</small></span><ArrowUpRight size={17} /></Link><Link to="/categories"><span className="admin-action-icon"><Box size={19} /></span><span><strong>Shape your catalog</strong><small>Manage categories and instruments</small></span><ArrowUpRight size={17} /></Link><Link to="/analytics"><span className="admin-action-icon"><Activity size={19} /></span><span><strong>Get to know your customers</strong><small>Explore product and time insights</small></span><ArrowUpRight size={17} /></Link></div><div className="admin-order-value"><span>Order value · all time</span><strong>{money(data.total_revenue)}</strong><p>Value of placed orders, including pending orders. Payment collection is not connected.</p></div></section>
      </div>
      <section className="admin-panel admin-recent"><div className="admin-panel-heading"><div><h2>Latest orders</h2><p>Keep every customer’s next step in sight.</p></div><Link to="/orders" className="admin-text-link">View all orders <ArrowRight size={16} /></Link></div>{data.recent_orders?.length ? <div className="table-wrapper"><table><thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Value</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{data.recent_orders.map((order) => <tr key={order.id}><td><Link to={`/orders/${order.id}`}>ORD-{String(order.id).padStart(4, '0')}</Link></td><td>{order.customer}</td><td>{new Date(order.created_at).toLocaleDateString()}</td><td>{money(order.total)}</td><td><span className="admin-status">{order.status.replaceAll('_', ' ')}</span></td><td><Link to={`/orders/${order.id}`} aria-label={`View order ${order.id}`}><ArrowUpRight size={17} /></Link></td></tr>)}</tbody></table></div> : <Empty icon={ShoppingBag} title="Ready for your first order" text="New orders and quote requests will appear here as they arrive." />}</section>
      <footer className="admin-overview-footer"><span><i /> Connected to your store</span><span>Summary and time insights are all time. Order activity uses the selected period.</span></footer>
    </>}
  </div>;
}
