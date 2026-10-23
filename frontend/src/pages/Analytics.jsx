import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Clock3,
  DollarSign,
  Eye,
  PackageSearch,
  PieChart,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const number = (value) => Number(value || 0).toLocaleString();
const seconds = (value) => {
  const total = Number(value || 0);
  if (total < 60) return `${Math.round(total)}s`;
  const minutes = Math.floor(total / 60);
  const remaining = Math.round(total % 60);
  return `${minutes}m ${remaining}s`;
};

const KpiCard = ({ icon: Icon, label, value, detail, tone }) => (
  <div className="analytics-kpi-card">
    <div className={`analytics-kpi-icon ${tone}`}>
      <Icon size={24} />
    </div>
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </div>
  </div>
);

const EmptyBlock = ({ label }) => (
  <div className="analytics-empty">
    <PackageSearch size={30} />
    <span>{label}</span>
  </div>
);

const SalesLineChart = ({ data }) => {
  const points = data || [];
  const maxRevenue = Math.max(...points.map((item) => Number(item.revenue || 0)), 1);
  const width = 640;
  const height = 220;
  const padding = 24;
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const path = points
    .map((item, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (Number(item.revenue || 0) / maxRevenue) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="analytics-chart-panel analytics-wide-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Revenue Trend</h3>
          <p>Daily revenue across the last 30 days</p>
        </div>
        <span>{money(maxRevenue)} peak</span>
      </div>
      {points.length ? (
        <div className="analytics-line-chart">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Revenue trend chart">
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
            <path d={path} />
            {points.map((item, index) => {
              const x = padding + index * xStep;
              const y = height - padding - (Number(item.revenue || 0) / maxRevenue) * (height - padding * 2);
              return <circle key={item.date} cx={x} cy={y} r={index === points.length - 1 ? 5 : 3} />;
            })}
          </svg>
          <div className="analytics-chart-axis">
            <span>{points[0]?.date}</span>
            <span>{points[points.length - 1]?.date}</span>
          </div>
        </div>
      ) : (
        <EmptyBlock label="No revenue data yet" />
      )}
    </div>
  );
};

const MiniBarChart = ({ title, subtitle, items, valueKey, labelKey = 'name', formatter = number }) => {
  const maxValue = Math.max(...(items || []).map((item) => Number(item[valueKey] || 0)), 1);

  return (
    <div className="analytics-chart-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <BarChart3 size={22} />
      </div>
      {items?.length ? (
        <div className="analytics-bar-list">
          {items.map((item) => {
            const value = Number(item[valueKey] || 0);
            return (
              <div className="analytics-bar-row" key={`${title}-${item.product_id || item[labelKey]}`}>
                <div className="analytics-bar-copy">
                  <span>{item[labelKey]}</span>
                  <strong>{formatter(value)}</strong>
                </div>
                <div className="analytics-bar-track">
                  <div style={{ width: `${Math.max(5, (value / maxValue) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyBlock label="No product data yet" />
      )}
    </div>
  );
};

const DonutChart = ({ items }) => {
  const total = (items || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  let offset = 25;

  return (
    <div className="analytics-chart-panel">
      <div className="analytics-panel-header">
        <div>
          <h3>Order Status</h3>
          <p>Current order pipeline</p>
        </div>
        <PieChart size={22} />
      </div>
      {total ? (
        <div className="analytics-donut-wrap">
          <svg className="analytics-donut" viewBox="0 0 42 42" role="img" aria-label="Order status breakdown">
            <circle cx="21" cy="21" r="15.915" />
            {items.map((item, index) => {
              const percent = (Number(item.count || 0) / total) * 100;
              const segment = (
                <circle
                  key={item.status}
                  cx="21"
                  cy="21"
                  r="15.915"
                  stroke={colors[index % colors.length]}
                  strokeDasharray={`${percent} ${100 - percent}`}
                  strokeDashoffset={offset}
                />
              );
              offset -= percent;
              return segment;
            })}
          </svg>
          <div className="analytics-donut-center">
            <strong>{number(total)}</strong>
            <span>orders</span>
          </div>
          <div className="analytics-legend">
            {items.map((item, index) => (
              <div key={item.status}>
                <i style={{ background: colors[index % colors.length] }} />
                <span>{item.status}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyBlock label="No orders yet" />
      )}
    </div>
  );
};

const UserFlowHeatmap = ({ items }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalDuration = (items || []).reduce((sum, item) => sum + Number(item.total_duration_seconds || 0), 0);
  const maxViews = Math.max(...(items || []).map(i => Number(i.total_views || 0)), 1);
  
  const content = (
    <div className={`analytics-heatmap-container ${isExpanded ? 'expanded' : ''}`} onClick={!isExpanded ? () => setIsExpanded(true) : undefined} style={{ cursor: !isExpanded ? 'pointer' : 'default' }}>
      <div className="analytics-panel-header">
        <div>
          <h3>User Flow & Journey Heatmap</h3>
          <p>Visual map of user engagement paths across products</p>
        </div>
        {isExpanded && (
          <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}>Close View</button>
        )}
      </div>
      
      {items?.length ? (
        <div className="analytics-heatmap-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: isExpanded ? 'repeat(auto-fill, minmax(250px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))', 
          gap: '1rem', 
          marginTop: '1rem' 
        }}>
          {items.map((item, index) => {
            const intensity = Math.min(1, Number(item.total_views || 0) / maxViews);
            return (
              <div key={item.product_id} className="heatmap-node" style={{
                background: `rgba(245, 158, 11, ${Math.max(0.05, intensity * 0.4)})`,
                border: `1px solid rgba(245, 158, 11, ${Math.max(0.2, intensity)})`,
                padding: '1rem',
                borderRadius: '8px',
                position: 'relative',
                transition: 'all 0.2s'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>Views:</span> <strong>{item.total_views}</strong></span>
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>Time:</span> <strong>{seconds(item.total_duration_seconds)}</strong></span>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>Unique Users:</span> <strong>{item.unique_viewers}</strong></span>
                    <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>Repeat Views:</span> <strong>{item.repeat_logged_in_views}</strong></span>
                    <span style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', color: 'var(--brand-primary)' }}><span>3D Interaction:</span> <strong>{seconds(item.model_3d_seconds)}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyBlock label="No user flow data yet" />
      )}
    </div>
  );

  if (isExpanded) {
    return (
      <div className="heatmap-modal-overlay animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 10, 10, 0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(8px)' }}>
        <div className="analytics-chart-panel" style={{ width: '100%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-chart-panel" style={{ gridColumn: '1 / -1' }}>
      {content}
    </div>
  );
};

const Analytics = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!isAdminRole) {
      navigate('/dashboard');
      return;
    }

    const fetchMetrics = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        setMetrics(res.data);
      } catch (e) {
        console.error('Failed to fetch analytics', e);
        setError(e.response?.data?.detail || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [isAdminRole, navigate]);

  const topEngagementRows = useMemo(
    () => metrics?.product_engagement_table?.slice(0, 8) || [],
    [metrics]
  );

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (error || !metrics) {
    return (
      <div className="analytics-error">
        <Activity size={38} />
        <h2>Analytics unavailable</h2>
        <p>{error || 'Dashboard data could not be loaded right now.'}</p>
      </div>
    );
  }

  return (
    <div className="analytics-page animate-fade-in">
      <div className="analytics-hero">
        <div>
          <span className="analytics-eyebrow">Admin analytics</span>
          <h2 className="text-gradient">Business performance dashboard</h2>
          <p>Sales, orders, product interest, and catalog engagement in one readable workspace.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
          <ShoppingBag size={18} /> Review orders
        </button>
      </div>

      <section className="analytics-kpi-grid">
        <KpiCard icon={DollarSign} label="Revenue" value={money(metrics.total_revenue)} detail={`${money(metrics.avg_order_value)} avg order`} tone="green" />
        <KpiCard icon={ShoppingBag} label="Orders" value={number(metrics.total_orders)} detail="All statuses included" tone="blue" />
        <KpiCard icon={Users} label="Customers" value={number(metrics.total_customers || metrics.total_users)} detail={`${number(metrics.total_users)} total accounts`} tone="purple" />
        <KpiCard icon={Eye} label="Product views" value={number(metrics.total_product_views)} detail={`${seconds(metrics.avg_product_view_seconds)} avg view`} tone="amber" />
      </section>

      <section className="analytics-grid analytics-grid-main">
        <SalesLineChart data={metrics.revenue_trend} />
        <DonutChart items={metrics.order_status_breakdown} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr', marginBottom: '1.5rem' }}>
        <UserFlowHeatmap items={metrics.product_engagement_table} />
      </section>

      <section className="analytics-grid">
        <MiniBarChart
          title="Top Selling Products"
          subtitle="Units sold by product"
          items={metrics.top_selling_products}
          valueKey="sold_quantity"
        />
        <MiniBarChart
          title="Most Viewed Products"
          subtitle="Catalog attention before orders"
          items={metrics.most_viewed_products}
          valueKey="total_views"
        />
        <MiniBarChart
          title="Low Selling Products"
          subtitle="Products that may need attention"
          items={metrics.low_selling_products}
          valueKey="sold_quantity"
        />
        <MiniBarChart
          title="Least Viewed Products"
          subtitle="Products with low discovery"
          items={metrics.least_viewed_products}
          valueKey="total_views"
        />
      </section>

      <section className="analytics-kpi-grid analytics-engagement-cards">
        <KpiCard icon={Sparkles} label="3D model time" value={seconds(metrics.customization_summary?.model_3d_seconds)} detail={`${number(metrics.customization_summary?.model_3d_events)} model events`} tone="blue" />
        <KpiCard icon={Clock3} label="Customization time" value={seconds(metrics.customization_summary?.customization_seconds)} detail={`${number(metrics.customization_summary?.customization_events)} customization events`} tone="green" />
        <KpiCard icon={Activity} label="Description reads" value={number(metrics.customization_summary?.description_views)} detail="Product copy engagement" tone="purple" />
      </section>

      <section className="analytics-table-grid">
        <div className="analytics-table-panel">
          <div className="analytics-panel-header">
            <div>
              <h3>Product Engagement</h3>
              <p>Views, unique visitors, repeat views, reading, 3D, and customization signals</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Views</th>
                  <th>Unique</th>
                  <th>Repeat</th>
                  <th>Avg time</th>
                  <th>Total time</th>
                  <th>3D</th>
                  <th>Custom</th>
                </tr>
              </thead>
              <tbody>
                {topEngagementRows.length ? (
                  topEngagementRows.map((row) => (
                    <tr key={row.product_id}>
                      <td>
                        <strong>{row.name}</strong>
                        <span>{row.sku || `PRODUCT-${row.product_id}`}</span>
                      </td>
                      <td>{number(row.total_views)}</td>
                      <td>{number(row.unique_viewers)}</td>
                      <td>{number(row.repeat_logged_in_views)}</td>
                      <td>{seconds(row.avg_duration_seconds)}</td>
                      <td>{seconds(row.total_duration_seconds)}</td>
                      <td>{seconds(row.model_3d_seconds)}</td>
                      <td>{seconds(row.customization_seconds)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">No engagement data has been captured yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="analytics-side-stack">
          <div className="analytics-list-panel">
            <div className="analytics-panel-header">
              <div>
                <h3>Recent Orders</h3>
                <p>Latest transactions</p>
              </div>
            </div>
            {metrics.recent_orders?.length ? (
              <div className="analytics-order-list">
                {metrics.recent_orders.map((order) => (
                  <div key={order.id}>
                    <span>ORD-{String(order.id).padStart(4, '0')}</span>
                    <strong>{money(order.total)}</strong>
                    <em>{order.status}</em>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock label="No recent orders" />
            )}
          </div>

          <div className="analytics-list-panel">
            <div className="analytics-panel-header">
              <div>
                <h3>Most Active Customers</h3>
                <p>Orders plus tracked engagement</p>
              </div>
            </div>
            {metrics.active_customers?.length ? (
              <div className="analytics-customer-list">
                {metrics.active_customers.map((customer) => (
                  <div key={customer.user_id}>
                    <div>
                      <strong>{customer.name}</strong>
                      <span>{customer.email}</span>
                    </div>
                    <em>{customer.orders} orders</em>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock label="No active customer data" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Analytics;
