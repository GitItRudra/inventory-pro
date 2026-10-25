import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
const EMPTY = { name: '', email: '', password: '', shopName: '', gstin: '' };

export default function Login() {
  const { user, saveSession } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY);
  const [pendingGoogle, setPendingGoogle] = useState(null);
  const [shopForm, setShopForm] = useState({ shopName: '', gstin: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const finish = (data) => {
    saveSession(data);
    navigate('/');
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } =
        mode === 'login'
          ? await api.post('/auth/login', { email: form.email, password: form.password })
          : await api.post('/auth/register-shop', form);
      finish(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (resp) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google', { credential: resp.credential });
      finish(data);
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.code === 'NEEDS_SHOP') {
        setPendingGoogle(resp.credential);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const createShopWithGoogle = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google-register', { credential: pendingGoogle, ...shopForm });
      finish(data);
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
        <h1>Stock, billing and GST for the shop you run.</h1>
        <p>Know every item on your shelves, bill customers in seconds, and see what to reorder before it runs out.</p>
        <ul>
          <li>Live stock levels with low-stock alerts</li>
          <li>GST-inclusive invoices you can print</li>
          <li>Invite your staff with a single link</li>
        </ul>
      </section>

      <section className="auth-card">
        {pendingGoogle ? (
          <>
            <h2>One more step</h2>
            <p className="muted">Tell us about your shop to finish creating your account.</p>
            {error && <div className="alert">{error}</div>}
            <form onSubmit={createShopWithGoogle} className="mt">
              <div className="field">
                <label htmlFor="g-shop">Shop name</label>
                <input id="g-shop" className="input" required value={shopForm.shopName} onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="g-gstin">GSTIN (optional)</label>
                <input id="g-gstin" className="input mono" value={shopForm.gstin} onChange={(e) => setShopForm({ ...shopForm, gstin: e.target.value.toUpperCase() })} />
              </div>
              <button className="btn primary full" disabled={busy}>{busy ? 'Creating...' : 'Create shop'}</button>
            </form>
            <p className="legal-note">
              <button type="button" className="link-btn" onClick={() => setPendingGoogle(null)}>Back</button>
            </p>
          </>
        ) : (
          <>
            <h2>{mode === 'login' ? 'Sign in to your shop' : 'Start your shop'}</h2>
            <p className="muted">{mode === 'login' ? 'Welcome back.' : 'Start with a 14-day free trial.'}</p>

            <div className="tabs" role="tablist">
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
              <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create shop</button>
            </div>

            {error && <div className="alert">{error}</div>}

            <form onSubmit={submit}>
              {mode === 'register' && (
                <>
                  <div className="field">
                    <label htmlFor="l-name">Your name</label>
                    <input id="l-name" className="input" name="name" required value={form.name} onChange={update} />
                  </div>
                  <div className="field">
                    <label htmlFor="l-shop">Shop name</label>
                    <input id="l-shop" className="input" name="shopName" required value={form.shopName} onChange={update} placeholder="Sharma General Store" />
                  </div>
                  <div className="field">
                    <label htmlFor="l-gstin">GSTIN (optional)</label>
                    <input id="l-gstin" className="input mono" name="gstin" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
                  </div>
                </>
              )}
              <div className="field">
                <label htmlFor="l-email">Email</label>
                <input id="l-email" className="input" type="email" name="email" required value={form.email} onChange={update} />
              </div>
              <div className="field">
                <label htmlFor="l-pass">Password</label>
                <input
                  id="l-pass"
                  className="input"
                  type="password"
                  name="password"
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  value={form.password}
                  onChange={update}
                  placeholder={mode === 'register' ? 'At least 8 characters' : ''}
                />
              </div>
              <button className="btn primary full" disabled={busy}>
                {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create shop'}
              </button>
            </form>

            {GOOGLE_ENABLED && (
              <>
                <div className="divider">or</div>
                <div className="google-slot">
                  <GoogleLogin
                    onSuccess={onGoogle}
                    onError={() => setError('Google sign-in was cancelled or failed.')}
                    text="continue_with"
                    shape="rectangular"
                    width="360"
                    useOneTap={false}
                  />
                </div>
              </>
            )}

            <p className="legal-note">
              By continuing you agree to our <Link to="/terms">Terms and Conditions</Link>.
            </p>
            <p className="legal-note">
              Staff? <Link to="/staff-login">Sign in with mobile number and PIN</Link>
            </p>
          </>
        )}
      </section>
    </div>
  );
}