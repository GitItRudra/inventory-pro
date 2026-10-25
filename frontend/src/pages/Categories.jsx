import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Categories() {
  const { user } = useAuth();
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get('/categories').then((r) => setCats(r.data)).catch((err) => setError(getErrorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/categories', form);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/categories/${c._id}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Categories</h1>
          <p>Group products the way you shelve them.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>All categories</h2><span className="muted">{cats.length} total</span></div>
          <table className="table">
            <thead>
              <tr><th>Name</th><th className="num">Products</th><th className="right"></th></tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.description && <small>{c.description}</small>}
                  </td>
                  <td className="num">{c.productCount}</td>
                  <td className="right">
                    {user?.role === 'owner' && (
                      <button className="icon-btn danger" onClick={() => remove(c)} title="Delete category">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cats.length === 0 && <div className="empty">No categories yet.</div>}
        </section>

        <section className="card">
          <div className="card-head"><h2>Add a category</h2></div>
          <form className="card-body" onSubmit={add}>
            <div className="field">
              <label htmlFor="c-name">Name</label>
              <input id="c-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Snacks" />
            </div>
            <div className="field">
              <label htmlFor="c-desc">Description</label>
              <textarea id="c-desc" className="textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Add category'}</button>
          </form>
        </section>
      </div>
    </>
  );
}