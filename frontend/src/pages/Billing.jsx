import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search, Trash2, X } from 'lucide-react';
import api, { getErrorMessage } from '../api';
import Modal from '../components/Modal';
import Invoice from '../components/Invoice';
import { useAuth } from '../context/AuthContext';
import { openRazorpay } from '../utils/payment';
import { inr } from '../utils/format';

const PAYMENT_MODES = ['cash', 'upi', 'card', 'credit', 'online'];

export default function Billing() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ customerName: '', customerPhone: '' });
  const [discount, setDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [pendingSale, setPendingSale] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get('/products', { params: { search: query, limit: 24, sort: 'name' } })
        .then((r) => setResults(r.data.items))
        .catch((err) => setError(getErrorMessage(err)));
    }, 200);
    return () => clearTimeout(t);
  }, [query, refresh]);

  const inCart = (id) => cart.find((c) => c.product._id === id)?.quantity || 0;

  const addItem = (product) => {
    setError('');
    if (product.quantity <= inCart(product._id)) {
      setError(`Only ${product.quantity} ${product.unit} of ${product.name} in stock`);
      return;
    }
    setCart((c) => {
      const found = c.find((x) => x.product._id === product._id);
      if (found) return c.map((x) => (x.product._id === product._id ? { ...x, quantity: x.quantity + 1 } : x));
      return [...c, { product, quantity: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setError('');
    const line = cart.find((x) => x.product._id === id);
    if (!line) return;
    const next = line.quantity + delta;
    if (next > line.product.quantity) {
      setError(`Only ${line.product.quantity} ${line.product.unit} of ${line.product.name} in stock`);
      return;
    }
    setCart((c) =>
      next <= 0
        ? c.filter((x) => x.product._id !== id)
        : c.map((x) => (x.product._id === id ? { ...x, quantity: next } : x))
    );
  };

  const onSearchKey = (e) => {
    if (e.key === 'Enter' && results.length === 1 && results[0].quantity > 0) {
      e.preventDefault();
      addItem(results[0]);
      setQuery('');
    }
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    cart.forEach(({ product, quantity }) => {
      const line = product.sellingPrice * quantity;
      subtotal += line;
      tax += line - line / (1 + product.gstRate / 100);
    });
    const disc = Math.min(Number(discount) || 0, subtotal);
    return { subtotal, tax, discount: disc, total: subtotal - disc };
  }, [cart, discount]);

  const payNow = async (sale) => {
    setError('');
    try {
      await openRazorpay(sale, {
        shopName: user?.shopName,
        onPaid: (paid) => {
          setPendingSale(null);
          setInvoice(paid);
          setRefresh((r) => r + 1);
        },
        onError: (msg) => setError(msg),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const checkout = async () => {
    setBusy(true);
    setError('');
    try {
      const { data: sale } = await api.post('/sales', {
        items: cart.map(({ product, quantity }) => ({ productId: product._id, quantity })),
        ...customer,
        discount: Number(discount) || 0,
        paymentMode,
      });
      setCart([]);
      setDiscount('');
      setCustomer({ customerName: '', customerPhone: '' });
      setRefresh((r) => r + 1);

      if (paymentMode === 'online') {
        setPendingSale(sale);
        await payNow(sale);
      } else {
        setInvoice(sale);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setRefresh((r) => r + 1);
    } finally {
      setBusy(false);
    }
  };

  const cancelPending = async () => {
    if (!pendingSale) return;
    if (!window.confirm(`Cancel ${pendingSale.invoiceNo}? Stock will be returned to the shelves.`)) return;
    try {
      await api.post(`/sales/${pendingSale._id}/cancel`);
      setPendingSale(null);
      setError('');
      setRefresh((r) => r + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Billing</h1>
          <p>Pick products or type a SKU and press Enter. Stock updates on checkout.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {pendingSale && (
        <div className="pending-box">
          <div>
            <strong>Awaiting payment: {pendingSale.invoiceNo}</strong>
            <small>{inr(pendingSale.grandTotal)} · stock is held until this bill is paid or cancelled</small>
          </div>
          <div className="actions">
            <button className="btn primary small" onClick={() => payNow(pendingSale)}>Retry payment</button>
            <button className="btn small" onClick={cancelPending}>
              <X size={14} />
              Cancel bill
            </button>
          </div>
        </div>
      )}

      <div className="pos">
        <section className="card">
          <div className="card-head">
            <div className="search wide">
              <Search size={16} />
              <input
                autoFocus
                className="input"
                placeholder="Search name or SKU"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
              />
            </div>
          </div>
          <div className="product-grid">
            {results.map((p) => {
              const out = p.quantity <= 0;
              return (
                <button key={p._id} className="product-tile" disabled={out} onClick={() => addItem(p)}>
                  <span className="mono muted">{p.sku}</span>
                  <strong>{p.name}</strong>
                  <small className="muted">{out ? 'Out of stock' : `${p.quantity} ${p.unit} left`} · GST {p.gstRate}%</small>
                  <span className="price">{inr(p.sellingPrice)}</span>
                </button>
              );
            })}
          </div>
          {results.length === 0 && <div className="empty">No products found.</div>}
        </section>

        <aside className="card cart">
          <div className="card-head">
            <h2>Current bill</h2>
            <span className="muted">{cart.length} {cart.length === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="card-body">
            {cart.length === 0 && <p className="muted">The bill is empty. Pick products from the list.</p>}
            {cart.map(({ product, quantity }) => (
              <div className="cart-line" key={product._id}>
                <div>
                  <strong>{product.name}</strong>
                  <small className="mono">{inr(product.sellingPrice)} each</small>
                </div>
                <div className="right"><strong>{inr(product.sellingPrice * quantity)}</strong></div>
                <div className="cart-controls">
                  <div className="qty">
                    <button onClick={() => changeQty(product._id, -1)} aria-label="Decrease"><Minus size={14} /></button>
                    <span>{quantity}</span>
                    <button onClick={() => changeQty(product._id, 1)} aria-label="Increase"><Plus size={14} /></button>
                  </div>
                  <button
                    className="icon-btn danger"
                    onClick={() => setCart((c) => c.filter((x) => x.product._id !== product._id))}
                    aria-label="Remove"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

            <div className="form-grid mt">
              <div className="field">
                <label htmlFor="b-name">Customer</label>
                <input id="b-name" className="input" placeholder="Walk-in" value={customer.customerName} onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="b-phone">Phone</label>
                <input id="b-phone" className="input" value={customer.customerPhone} onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="b-disc">Discount (INR)</label>
                <input id="b-disc" className="input" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="field">
                <label>Payment</label>
                <div className="pay-modes">
                  {PAYMENT_MODES.map((m) => (
                    <button key={m} type="button" className={paymentMode === m ? 'active' : ''} onClick={() => setPaymentMode(m)}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="totals">
              <div className="total-row"><span>Subtotal (incl. GST)</span><span>{inr(totals.subtotal)}</span></div>
              <div className="total-row"><span>of which GST</span><span>{inr(totals.tax)}</span></div>
              {totals.discount > 0 && <div className="total-row"><span>Discount</span><span>- {inr(totals.discount)}</span></div>}
              <div className="total-row strong"><span>Total</span><span>{inr(totals.total)}</span></div>
            </div>

            <button className="btn primary full mt" disabled={cart.length === 0 || busy || !!pendingSale} onClick={checkout}>
              {busy
                ? 'Saving bill...'
                : paymentMode === 'online'
                  ? `Create payment ${cart.length ? inr(totals.total) : ''}`
                  : `Checkout ${cart.length ? inr(totals.total) : ''}`}
            </button>
            {pendingSale && <p className="muted small-note">Settle or cancel the pending bill before starting another.</p>}
          </div>
        </aside>
      </div>

      {invoice && (
        <Modal title="Invoice" onClose={() => setInvoice(null)} width={760}>
          <Invoice sale={invoice} />
        </Modal>
      )}
    </>
  );
}