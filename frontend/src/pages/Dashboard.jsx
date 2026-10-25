import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, IndianRupee, Package } from 'lucide-react';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { dateTime, inr } from '../utils/format';

const shortDay = (key) =>
  new Date(`${key}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short' });

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setData(r.data)).catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!data) return <div className="loading">Loading dashboard...</div>;

  const peak = Math.max(1, ...data.last7Days.map((d) => d.revenue));
  const weekTotal = data.last7Days.reduce((s, d) => s + d.revenue, 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const kpis = [
    { label: "Today's revenue", value: inr(data.today.revenue), sub: `${data.today.count} invoices today`, icon: IndianRupee },
    { label: 'Products', value: data.totals.products, sub: `${data.totals.units} units in stock`, icon: Package },
    { label: 'Stock value', value: inr(data.totals.stockValue), sub: 'Valued at cost price', icon: Boxes },
    {
      label: 'Needs reorder',
      value: data.totals.lowStock,
      sub: `${data.totals.outOfStock} out of stock`,
      icon: AlertTriangle,
      warn: data.totals.lowStock > 0,
    },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting}, {user?.name?.split(' ')[0]}</h1>
          <p>Here is how {user?.shopName || 'your shop'} is doing today.</p>
        </div>
        <Link to="/billing" className="btn primary">New bill</Link>
      </div>

      <div className="kpis">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`card kpi ${k.warn ? 'warn' : ''}`}>
              <div className="label">
                {k.label}
                <Icon size={18} />
              </div>
              <div className="value">{k.value}</div>
              <div className="sub">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Revenue, last 7 days</h2>
            <span className="muted">{inr(weekTotal)} total</span>
          </div>
          <div className="card-body">
            <div className="bars">
              {data.last7Days.map((d) => (
                <div key={d._id} className="bar-col" title={`${d.count} invoices`}>
                  <span className="bar-value">{d.revenue ? inr(d.revenue) : '-'}</span>
                  <div className="bar" style={{ height: `${Math.max(2, (d.revenue / peak) * 100)}%` }} />
                  <small>{shortDay(d._id)}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Top sellers</h2>
            <span className="muted">by revenue</span>
          </div>
          {data.topProducts.length === 0 ? (
            <div className="empty">No sales yet. Your best sellers will appear here.</div>
          ) : (
            <table className="table">
              <tbody>
                {data.topProducts.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small className="mono">{p.sku}</small>
                    </td>
                    <td className="num">{p.qty} sold</td>
                    <td className="num"><strong>{inr(p.revenue)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="grid-2 even mt">
        <section className="card">
          <div className="card-head">
            <h2>Low and out of stock</h2>
            <Link to="/inventory?status=low" className="link-btn">View all</Link>
          </div>
          {data.lowStockItems.length === 0 ? (
            <div className="empty">Every product is above its reorder level.</div>
          ) : (
            <table className="table">
              <tbody>
                {data.lowStockItems.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small className="mono">{p.sku}</small>
                    </td>
                    <td className="num">
                      <span className={`badge ${p.quantity === 0 ? 'out' : 'low'}`}>
                        {p.quantity} {p.unit}
                      </span>
                    </td>
                    <td className="num muted">reorder at {p.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recent invoices</h2>
            <Link to="/sales" className="link-btn">View all</Link>
          </div>
          {data.recentSales.length === 0 ? (
            <div className="empty">No invoices yet.</div>
          ) : (
            <table className="table">
              <tbody>
                {data.recentSales.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <strong className="mono">{s.invoiceNo}</strong>
                      <small>{s.customerName} · {dateTime(s.createdAt)}</small>
                    </td>
                    <td className="num"><strong>{inr(s.grandTotal)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
