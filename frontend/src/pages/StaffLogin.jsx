import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';

export default function StaffLogin() {
  const { user, saveSession } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/pin-login', { phone, pin });
      saveSession(data);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-aside">
        <Link to="/" className="brand">
          <span className="brand-mark">IP</span>
          <strong>Inventory Pro</strong>
        </Link>
        <h1>Staff sign in</h1>
        <p>Use the mobile number and 6-digit PIN your shop owner or manager gave you.</p>
      </section>

      <section className="auth-card">
        <h2>Sign in with your PIN</h2>
        <p className="muted">No email or smartphone needed.</p>

        {error && <div className="alert">{error}</div>}

        <form onSubmit={submit} className="mt">
          <div className="field">
            <label htmlFor="sp-phone">Mobile number</label>
            <input
              id="sp-phone"
              className="input mono"
              inputMode="numeric"
              placeholder="10-digit number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="sp-pin">PIN</label>
            <input
              id="sp-pin"
              className="input mono"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>
          <button className="btn primary full" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="legal-note">
          Owner? <Link to="/login">Sign in with email</Link>
        </p>
      </section>
    </div>
  );
}