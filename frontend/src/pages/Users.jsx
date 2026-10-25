import { useEffect, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { dateOnly } from '../utils/format';

export default function Users() {
  const { user: me } = useAuth();
  const isOwner = me?.role === 'owner';
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', role: 'cashier' });
  const [issued, setIssued] = useState(null); // { name, pin }
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'cashier' });
  const [inviteLink, setInviteLink] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const roleOptions = isOwner ? ['manager', 'cashier'] : ['cashier'];

  const canManage = (m) =>
    m._id !== me?._id && (isOwner || (me?.role === 'manager' && m.role === 'cashier'));

  const load = () => {
    api.get('/users').then((r) => setMembers(r.data)).catch((err) => setError(getErrorMessage(err)));
    if (isOwner) api.get('/invites').then((r) => setInvites(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 3000);
  };

  const run = async (fn, message) => {
    setError('');
    try {
      await fn();
      if (message) flash(message);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/users', form);
      setIssued({ name: data.user.name, pin: data.temporaryPin });
      setForm({ name: '', phone: '', role: 'cashier' });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resetPin = async (m) => {
    if (!window.confirm(`Issue a new PIN for ${m.name}? Their old PIN stops working immediately.`)) return;
    setError('');
    try {
      const { data } = await api.post(`/users/${m._id}/reset-pin`);
      setIssued({ name: m.name, pin: data.temporaryPin });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const removeMember = (m) => {
    if (!window.confirm(`Remove ${m.name} from the shop? They lose access immediately.`)) return;
    run(() => api.delete(`/users/${m._id}`), 'Member removed');
  };

  const createInvite = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/invites', inviteForm);
      setInviteLink(data.link);
      setInviteForm({ email: '', role: 'cashier' });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const copy = async (text, message) => {
    await navigator.clipboard.writeText(text);
    flash(message);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Team</h1>
          <p>Add staff with just a name and mobile number. Email is optional.</p>
        </div>
      </div>

      {notice && <div className="alert success">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      {issued && (
        <div className="pin-box">
          <div>
            <strong>Temporary PIN for {issued.name}</strong>
            <small>Share it in person. They will be asked to choose their own PIN at first sign-in. It won't be shown again.</small>
          </div>
          <div className="pin-value">
            <span className="mono">{issued.pin}</span>
            <button className="btn small" onClick={() => copy(issued.pin, 'PIN copied')}>
              <Copy size={14} />
              Copy
            </button>
            <button className="btn ghost small" onClick={() => setIssued(null)}>Done</button>
          </div>
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Add a member</h2></div>
          <form className="card-body" onSubmit={addMember}>
            <div className="field">
              <label htmlFor="m-name">Name</label>
              <input id="m-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="m-phone">Mobile number</label>
              <input
                id="m-phone"
                className="input mono"
                inputMode="numeric"
                required
                placeholder="10-digit number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </div>
            <div className="field">
              <label htmlFor="m-role">Role</label>
              <select id="m-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{r === 'manager' ? 'Manager: stock, products, team' : 'Cashier: billing and stock in'}</option>
                ))}
              </select>
            </div>
            <button className="btn primary" disabled={busy}>{busy ? 'Adding...' : 'Add member and create PIN'}</button>
          </form>
        </section>

        {isOwner ? (
          <section className="card">
            <div className="card-head"><h2>Invite by email (optional)</h2></div>
            <form className="card-body" onSubmit={createInvite}>
              <div className="field">
                <label htmlFor="iv-email">Email</label>
                <input id="iv-email" className="input" type="email" required value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="iv-role">Role</label>
                <select id="iv-role" className="select" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <button className="btn">Create invite link</button>
            </form>
            {inviteLink && (
              <div className="card-body invite-link">
                <label className="muted">Works once, expires in 7 days.</label>
                <div className="link-row">
                  <input className="input mono" readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                  <button className="btn" onClick={() => copy(inviteLink, 'Invite link copied')}>
                    <Copy size={15} />
                    Copy
                  </button>
                </div>
              </div>
            )}
            {invites.length > 0 && (
              <table className="table">
                <tbody>
                  {invites.map((i) => (
                    <tr key={i._id}>
                      <td>
                        <strong>{i.email}</strong>
                        <small>{i.role} · expires {dateOnly(i.expiresAt)}</small>
                      </td>
                      <td className="right">
                        <button className="btn small" onClick={() => run(() => api.delete(`/invites/${i._id}`), 'Invite revoked')}>Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : (
          <section className="card">
            <div className="card-head"><h2>Your access</h2></div>
            <div className="card-body">
              <p className="muted">You can add cashiers and reset their PINs. Only the owner can change roles or add managers.</p>
            </div>
          </section>
        )}
      </div>

      <div className="card mt">
        <div className="card-head">
          <h2>Team members</h2>
          <span className="muted">{members.length} people</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isMe = m._id === me?._id;
                return (
                  <tr key={m._id}>
                    <td>
                      <strong>{m.name}</strong>
                      <small>{m.phone || m.email || 'No contact on file'}{isMe ? ' · you' : ''}</small>
                    </td>
                    <td>
                      {isOwner && !isMe ? (
                        <select className="select" value={m.role} onChange={(e) => run(() => api.patch(`/users/${m._id}`, { role: e.target.value }), 'Role updated')}>
                          <option value="owner">Owner</option>
                          <option value="manager">Manager</option>
                          <option value="cashier">Cashier</option>
                        </select>
                      ) : (
                        <span className="badge neutral">{m.role}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${m.isActive ? 'ok' : 'neutral'}`}>
                        {m.isActive ? 'Active' : 'Disabled'}
                      </span>
                      {m.mustSetPin && <small>PIN pending</small>}
                    </td>
                    <td>{dateOnly(m.createdAt)}</td>
                    <td className="right">
                      {canManage(m) && (
                        <>
                          {m.phone && (
                            <button className="btn small" onClick={() => resetPin(m)}>Reset PIN</button>
                          )}{' '}
                          <button
                            className="btn small"
                            onClick={() =>
                              run(
                                () => api.patch(`/users/${m._id}`, { isActive: !m.isActive }),
                                m.isActive ? 'Access disabled' : 'Access restored'
                              )
                            }
                          >
                            {m.isActive ? 'Disable' : 'Enable'}
                          </button>{' '}
                          <button className="icon-btn danger" title="Remove" onClick={() => removeMember(m)}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}