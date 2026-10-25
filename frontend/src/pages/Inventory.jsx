import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../api';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import ProductForm from '../components/ProductForm';
import StockAdjustForm from '../components/StockAdjustForm';
import { useAuth } from '../context/AuthContext';
import { inr } from '../utils/format';
import { can } from '../utils/permissions';

const STATUS_LABEL = { ok: 'In stock', low: 'Low stock', out: 'Out of stock' };

export default function Inventory() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', status: searchParams.get('status') || '', page: 1 });
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const flash = useCallback((type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/products', { params: { ...filters, limit: 15 } });
      setData(res);
    } catch (err) {
      flash('error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters, flash]);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const setFilter = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? Its stock history stays in the ledger.`)) return;
    try {
      await api.delete(`/products/${p._id}`);
      flash('success', 'Product deleted');
      load();
    } catch (err) {
      flash('error', getErrorMessage(err));
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      flash('error', getErrorMessage(err));
    }
  };

  const onSaved = (text) => {
    setEditing(null);
    setAdjusting(null);
    flash('success', text);
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inventory</h1>
          <p>{data.total} products in your catalogue</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={exportCsv}>
            <Download size={16} />
            Export CSV
          </button>
          <button className="btn primary" onClick={() => setEditing('new')}>
            <Plus size={16} />
            Add product
          </button>
        </div>
      </div>

      {notice && <div className={`alert ${notice.type === 'success' ? 'success' : ''}`}>{notice.text}</div>}

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            className="input"
            placeholder="Search by name, SKU or barcode"
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
        </div>
        <select className="select" value={filters.category} onChange={(e) => setFilter({ category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="select" value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
          <option value="">All stock levels</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="num">Price</th>
                <th className="num">GST</th>
                <th className="num">Stock</th>
                <th>Location</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p._id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small className="mono">{p.sku}{p.hsnCode ? ` · HSN ${p.hsnCode}` : ''}</small>
                  </td>
                  <td>{p.category?.name || <span className="muted">Uncategorised</span>}</td>
                  <td className="num">
                    <strong>{inr(p.sellingPrice)}</strong>
                                        {can(user?.role, 'cost.view') && <small>cost {inr(p.costPrice)}</small>}
                  </td>
                  <td className="num">{p.gstRate}%</td>
                  <td className="num">
                    <div className="stock-cell">
                      <span className="stock-qty">{p.quantity} {p.unit}</span>
                      <span className={`badge ${p.stockStatus}`}>{STATUS_LABEL[p.stockStatus]}</span>
                    </div>
                  </td>
                  <td>{p.location || <span className="muted">-</span>}</td>
                  <td className="right">
                    <button className="icon-btn" title="Adjust stock" onClick={() => setAdjusting(p)}>
                      <ArrowLeftRight size={16} />
                    </button>
                    <button className="icon-btn" title="Edit" onClick={() => setEditing(p)}>
                      <Pencil size={16} />
                    </button>
                    {user?.role === 'owner' && (
                      <button className="icon-btn danger" title="Delete" onClick={() => remove(p)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && data.items.length === 0 && <div className="empty">No products match these filters.</div>}
        <Pagination page={data.page} pages={data.pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add product' : `Edit ${editing.name}`} onClose={() => setEditing(null)} width={760}>
          <ProductForm product={editing === 'new' ? null : editing} categories={categories} onSaved={onSaved} />
        </Modal>
      )}
      {adjusting && (
        <Modal title={`Adjust stock: ${adjusting.name}`} onClose={() => setAdjusting(null)} width={480}>
          <StockAdjustForm product={adjusting} onSaved={onSaved} />
        </Modal>
      )}
    </>
  );
}