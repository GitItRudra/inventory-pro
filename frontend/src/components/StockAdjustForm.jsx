import { useState } from 'react';
import api, { getErrorMessage } from '../api';

const TYPES = [
  { value: 'in', label: 'Stock received' },
  { value: 'out', label: 'Stock removed (damage, loss, expiry)' },
  { value: 'adjust', label: 'Set exact count (stock take)' },
];

export default function StockAdjustForm({ product, onSaved }) {
  const [type, setType] = useState('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const qty = Number(quantity) || 0;
  const preview = type === 'in' ? product.quantity + qty : type === 'out' ? product.quantity - qty : qty;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/stock/adjust', { productId: product._id, type, quantity: qty, reason });
      onSaved(`Stock updated for ${product.name}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="stock-summary">
        <span>Current stock</span>
        <strong>{product.quantity} {product.unit}</strong>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="field">
        <label htmlFor="sa-type">Adjustment type</label>
        <select id="sa-type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sa-qty">{type === 'adjust' ? 'Counted quantity' : 'Quantity'}</label>
        <input id="sa-qty" className="input" type="number" min="0" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="sa-reason">Reason or note</label>
        <input id="sa-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Supplier invoice 4471" />
      </div>
      <div className="stock-summary">
        <span>Stock after this change</span>
        <strong className={preview < 0 ? 'danger-text' : ''}>
          {preview < 0 ? 'Not enough stock' : `${preview} ${product.unit}`}
        </strong>
      </div>
      <div className="modal-actions">
        <button className="btn primary" disabled={saving || preview < 0 || quantity === ''}>
          {saving ? 'Saving...' : 'Apply change'}
        </button>
      </div>
    </form>
  );
}
