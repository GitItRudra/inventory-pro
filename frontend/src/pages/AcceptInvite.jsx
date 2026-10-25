import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function AcceptInvite() {
  const { token } = useParams();
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/join/${token}`).then((r) => setInvite(r.data)).catch((err) => setLoadError(getErrorMessage(err)));
  }, [token]);

  const join = async (body) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/join/${token}/accept`, body);
      saveSession(data);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    join({ name: form.name, password: form.password });
  };

  return (
    <div className="auth-page">
      <section className="auth-aside">
        <Link to="/" className="brand">
          <span className="brand-mark">IP</span>
          <strong>Inventory Pro</strong>
        </Link>
        <h1>You have been invited to join a shop.</h1>
        <p>Set up your account to start billing, managing stock, and checking the dashboard with your team.</p>
      </section>

      <section className="auth-card">
        {loadError ? (
          <>
            <h2>Invite not available</h2>
            <div className="alert">{loadError}</div>
            <p className="legal-note"><Link to="/login">Go to sign in</Link></p>
          </>
        ) : !invite ? (
          <p className="muted">Checking your invite...</p>
        ) : (
          <>
            <h2>Join {invite.shopName}</h2>
            <p className="muted">
              You are joining as <strong>{invite.role}</strong> with <strong>{invite.email}</strong>.
            </p>

            {error && <div className="alert">{error}</div>}

            <form onSubmit={submit} className="mt">
              <div className="field">
                <label htmlFor="inv-name">Your name</label>
                <input id="inv-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="inv-pass">Create a password</label>
                <input id="inv-pass" className="input" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
              </div>
              <button className="btn primary full" disabled={busy}>{busy ? 'Joining...' : 'Join shop'}</button>
            </form>

            {GOOGLE_ENABLED && (
              <>
                <div className="divider">or</div>
                <div className="google-slot">
                  <GoogleLogin
                    onSuccess={(resp) => join({ credential: resp.credential })}
                    onError={() => setError('Google sign-in was cancelled or failed.')}
                    text="continue_with"
                    shape="rectangular"
                    width="360"
                    useOneTap={false}
                  />
                </div>
              </>
            )}

            <p className="legal-note"><Link to="/login">Already have an account? Sign in</Link></p>
          </>
        )}
      </section>
    </div>
  );
}