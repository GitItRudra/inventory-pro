import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api';
import Pagination from '../components/Pagination';
import { dateTime } from '../utils/format';

const TYPE_LABEL = { in: 'Stock in', out: 'Stock out', adjust: 'Adjustment', sale: 'Sale' };

export default function StockLedger() {
  const [filters, setFilters] = useState({ type: '', page: 1 });
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/stock/movements', { params: { ...filters, limit: 20 } })
      .then((r) => setData(r.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [filters]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Stock ledger</h1>
          <p>Every change to stock, with the balance after it happened.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="toolbar">
        <select className="select" value={filters.type} onChange={(e) => setFilters({ type: e.target.value, page: 1 })}>
          <option value="">All movements</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Product</th>
                <th>Type</th>
                <th className="num">Change</th>
                <th className="num">Balance</th>
                <th>Reference and note</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m._id}>
                  <td>{dateTime(m.createdAt)}</td>
                  <td>
                    <strong>{m.product?.name || 'Deleted product'}</strong>
                    {m.product?.sku && <small className="mono">{m.product.sku}</small>}
                  </td>
                  <td><span className={`badge t-${m.type}`}>{TYPE_LABEL[m.type]}</span></td>
                  <td className={`num change ${m.quantity < 0 ? 'neg' : 'pos'}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="num">{m.balanceAfter}</td>
                  <td>
                    {m.reference && <span className="mono">{m.reference}</span>}
                    {m.reference && m.reason && ' · '}
                    {m.reason || (!m.reference && <span className="muted">-</span>)}
                  </td>
                  <td>{m.performedBy?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.items.length === 0 && <div className="empty">No stock movements recorded yet.</div>}
        <Pagination page={data.page} pages={data.pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>
    </>
  );
}
