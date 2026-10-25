import { useState } from 'react';
import api, { getErrorMessage } from '../api';

const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'pack', 'box', 'dozen', 'metre'];
const GST_RATES = [0, 5, 12, 18, 28];

export default function ProductForm({ product, categories, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(() => ({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    category: product?.category?._id || '',
    hsnCode: product?.hsnCode || '',
    unit: product?.unit || 'pcs',
    costPrice: product?.costPrice ?? '',
    sellingPrice: product?.sellingPrice ?? '',
    gstRate: product?.gstRate ?? 18,
    quantity: product?.quantity ?? '',
    reorderLevel: product?.reorderLevel ?? 5,
    location: product?.location || '',
    description: product?.description || '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice),
      gstRate: Number(form.gstRate),
      reorderLevel: Number(form.reorderLevel) || 0,
      category: form.category || null,
    };
    if (isEdit) delete payload.quantity;
    else payload.quantity = Number(form.quantity) || 0;

    try {
      if (isEdit) await api.put(`/products/${product._id}`, payload);
      else await api.post('/products', payload);
      onSaved(`Product ${isEdit ? 'updated' : 'added'} successfully`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="alert">{error}</div>}
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="pf-name">Product name</label>
          <input id="pf-name" className="input" required value={form.name} onChange={set('name')} placeholder="e.g. Full Cream Milk 1 L" />
        </div>
        <div className="field">
          <label htmlFor="pf-sku">SKU</label>
          <input id="pf-sku" className="input mono" required value={form.sku} onChange={set('sku')} placeholder="MILK-FC-1L" />
        </div>
        <div className="field">
          <label htmlFor="pf-barcode">Barcode (optional)</label>
          <input id="pf-barcode" className="input" value={form.barcode} onChange={set('barcode')} />
        </div>
        <div className="field">
          <label htmlFor="pf-cat">Category</label>
          <select id="pf-cat" className="select" value={form.category} onChange={set('category')}>
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pf-hsn">HSN code</label>
          <input id="pf-hsn" className="input" value={form.hsnCode} onChange={set('hsnCode')} />
        </div>
        <div className="field">
          <label htmlFor="pf-unit">Unit</label>
          <select id="pf-unit" className="select" value={form.unit} onChange={set('unit')}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pf-gst">GST rate</label>
          <select id="pf-gst" className="select" value={form.gstRate} onChange={set('gstRate')}>
            {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pf-sell">Selling price (incl. GST)</label>
          <input id="pf-sell" className="input" type="number" min="0" step="0.01" required value={form.sellingPrice} onChange={set('sellingPrice')} />
        </div>
        <div className="field">
          <label htmlFor="pf-cost">Cost price</label>
          <input id="pf-cost" className="input" type="number" min="0" step="0.01" value={form.costPrice} onChange={set('costPrice')} />
        </div>
        <div className="field">
          <label htmlFor="pf-qty">{isEdit ? 'Current stock' : 'Opening stock'}</label>
          <input
            id="pf-qty"
            className="input"
            type="number"
            min="0"
            value={form.quantity}
            onChange={set('quantity')}
            disabled={isEdit}
            title={isEdit ? 'Use the stock adjust button to change quantity' : ''}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-reorder">Reorder level</label>
          <input id="pf-reorder" className="input" type="number" min="0" value={form.reorderLevel} onChange={set('reorderLevel')} />
        </div>
        <div className="field span-2">
          <label htmlFor="pf-loc">Shelf or location</label>
          <input id="pf-loc" className="input" value={form.location} onChange={set('location')} placeholder="e.g. Rack B2" />
        </div>
        <div className="field span-2">
          <label htmlFor="pf-desc">Notes</label>
          <textarea id="pf-desc" className="textarea" rows={3} value={form.description} onChange={set('description')} />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add product'}</button>
      </div>
    </form>
  );
}
