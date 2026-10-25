import { useState } from 'react';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';

// Shown after a temporary PIN is issued. The member picks their own PIN before using the app.
export default function SetPin() {
  const { user, setUser, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(pin)) return setError('Your PIN must be exactly 6 digits');
    if (pin !== confirm) return setError('The two PINs do not match');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/set-pin', { pin });
      setUser(data.user);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-aside">
        <span className="brand-mark">IP</span>
        <h1>Welcome, {user?.name?.split(' ')[0]}.</h1>
        <p>Choose a 6-digit PIN you will remember. You will use it to sign in at the counter.</p>
      </section>

      <section className="auth-card">
        <h2>Set your PIN</h2>
        <p className="muted">Keep it private. Do not share it with customers or other staff.</p>

        {error && <div className="alert">{error}</div>}

        <form onSubmit={submit} className="mt">
          <div className="field">
            <label htmlFor="sv-pin">New PIN</label>
            <input
              id="sv-pin"
              className="input mono"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="sv-confirm">Confirm PIN</label>
            <input
              id="sv-confirm"
              className="input mono"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>
          <button className="btn primary full" disabled={busy}>
            {busy ? 'Saving...' : 'Save PIN and continue'}
          </button>
        </form>

        <p className="legal-note">
          <button type="button" className="link-btn" onClick={logout}>Sign out</button>
        </p>
      </section>
    </div>
  );
}