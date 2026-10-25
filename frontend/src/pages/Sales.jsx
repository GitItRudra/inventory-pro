import { useEffect, useState } from 'react';
import { CreditCard, Eye, XCircle } from 'lucide-react';
import api, { getErrorMessage } from '../api';
import Modal from '../components/Modal';
import Invoice from '../components/Invoice';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { openRazorpay } from '../utils/payment';
import { dateTime, inr } from '../utils/format';
import { can } from '../utils/permissions';

const PAYMENT_BADGE = { paid: 'ok', pending: 'low', failed: 'out' };
const PAYMENT_LABEL = { paid: 'Paid', pending: 'Awaiting payment', failed: 'Failed' };

export default function Sales() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ from: '', to: '', page: 1 });
  const [data, setData] = useState({ items: [], pages: 1, total: 0, totalRevenue: 0 });
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api
      .get('/sales', { params: { ...filters, limit: 15 } })
      .then((r) => setData(r.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [filters, refresh]);

  const reload = () => setRefresh((r) => r + 1);
  const setDate = (key) => (e) => setFilters((f) => ({ ...f, page: 1, [key]: e.target.value }));

  const canCancel = (s) =>
    s.status !== 'cancelled' &&
    (s.paymentStatus !== 'paid' || (can(user?.role, 'sales.cancelPaid') && s.paymentMode !== 'online'));

  const pay = async (s) => {
    setError('');
    try {
      await openRazorpay(s, {
        shopName: user?.shopName,
        onPaid: () => reload(),
        onError: (msg) => {
          setError(msg);
          reload();
        },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const cancel = async (s) => {
    if (!window.confirm(`Cancel ${s.invoiceNo}? Stock will be returned to the shelves.`)) return;
     let reason = '';
     if (s.paymentStatus === 'paid') {
       reason = (window.prompt('Reason for cancelling this paid bill (required):', '') || '').trim();
       if (!reason) return;
     }
     setError('');
     try {
       await api.post(`/sales/${s._id}/cancel`, { reason });
       reload();
     } catch (err) {
       setError(getErrorMessage(err));
     }
   };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sales</h1>
          <p>{data.total} invoices in the selected period</p>
        </div>
        <div className="summary-chip">
          <span className="muted">Collected in view</span>
          <strong>{inr(data.totalRevenue)}</strong>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="toolbar">
        <div className="field inline">
          <label htmlFor="s-from">From</label>
          <input id="s-from" type="date" className="input" value={filters.from} onChange={setDate('from')} />
        </div>
        <div className="field inline">
          <label htmlFor="s-to">To</label>
          <input id="s-to" type="date" className="input" value={filters.to} onChange={setDate('to')} />
        </div>
        {(filters.from || filters.to) && (
          <button className="btn ghost" onClick={() => setFilters({ from: '', to: '', page: 1 })}>Clear dates</button>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="num">Items</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="num">Total</th>
                <th className="right"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s._id} style={s.status === 'cancelled' ? { opacity: 0.55 } : undefined}>
                  <td className="mono"><strong>{s.invoiceNo}</strong></td>
                  <td>{dateTime(s.createdAt)}</td>
                  <td>
                    {s.customerName}
                    {s.customerPhone && <small>{s.customerPhone}</small>}
                  </td>
                  <td className="num">{s.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td><span className="badge neutral upper">{s.paymentMode}</span></td>
                  <td>
                    {s.status === 'cancelled' ? (
                      <span className="badge neutral">Cancelled</span>
                    ) : (
                      <span className={`badge ${PAYMENT_BADGE[s.paymentStatus] || 'ok'}`}>
                        {PAYMENT_LABEL[s.paymentStatus] || 'Paid'}
                      </span>
                    )}
                  </td>
                  <td className="num"><strong>{inr(s.grandTotal)}</strong></td>
                  <td className="right">
                    {s.status !== 'cancelled' && s.paymentMode === 'online' && s.paymentStatus !== 'paid' && (
                      <button className="icon-btn" title="Pay now" onClick={() => pay(s)}>
                        <CreditCard size={16} />
                      </button>
                    )}
                    <button className="icon-btn" title="View invoice" onClick={() => setViewing(s)}>
                      <Eye size={16} />
                    </button>
                    {canCancel(s) && (
                      <button className="icon-btn danger" title="Cancel bill" onClick={() => cancel(s)}>
                        <XCircle size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.items.length === 0 && <div className="empty">No invoices found for this period.</div>}
        <Pagination page={data.page} pages={data.pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>

      {viewing && (
        <Modal title="Invoice" onClose={() => setViewing(null)} width={760}>
          <Invoice sale={viewing} />
        </Modal>
      )}
    </>
  );
}