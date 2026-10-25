import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import api, { getErrorMessage } from '../api';

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ keyId: '', keySecret: '', webhookSecret: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/shop/payments').then((r) => setStatus(r.data)).catch((err) => setError(getErrorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 3500);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.put('/shop/payments', form);
      setStatus(data);
      setForm({ keyId: '', keySecret: '', webhookSecret: '' });
      flash('Razorpay keys verified and saved');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove the Razorpay keys? Online payments stop until you add them again.')) return;
    setError('');
    try {
      await api.delete('/shop/payments');
      load();
      flash('Razorpay keys removed');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(status.webhookUrl);
    flash('Webhook URL copied');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Connect your own Razorpay account so online payments go straight to your shop.</p>
        </div>
      </div>

      {notice && <div className="alert success">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Razorpay keys</h2>
            {status?.configured ? (
              <span className="badge ok">Connected: {status.keyId}</span>
            ) : (
              <span className="badge neutral">Not connected</span>
            )}
          </div>
          <form className="card-body" onSubmit={save}>
            <div className="field">
              <label htmlFor="rz-id">Key ID</label>
              <input
                id="rz-id"
                className="input mono"
                required
                placeholder="rzp_test_..."
                value={form.keyId}
                onChange={(e) => setForm({ ...form, keyId: e.target.value.trim() })}
              />
            </div>
            <div className="field">
              <label htmlFor="rz-secret">Key Secret</label>
              <input
                id="rz-secret"
                className="input mono"
                type="password"
                required
                value={form.keySecret}
                onChange={(e) => setForm({ ...form, keySecret: e.target.value.trim() })}
              />
            </div>
            <div className="field">
              <label htmlFor="rz-wh">Webhook secret</label>
              <input
                id="rz-wh"
                className="input mono"
                type="password"
                required
                value={form.webhookSecret}
                onChange={(e) => setForm({ ...form, webhookSecret: e.target.value.trim() })}
              />
            </div>
            <div className="actions">
              <button className="btn primary" disabled={busy}>{busy ? 'Checking keys...' : 'Verify and save'}</button>
              {status?.configured && (
                <button type="button" className="btn" onClick={remove}>Remove keys</button>
              )}
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-head"><h2>Webhook setup</h2></div>
          <div className="card-body">
            <p className="muted">
              In your Razorpay dashboard (test or live mode), go to <strong>Settings &gt; Webhooks &gt; Add new webhook</strong>.
              Paste this URL, enter the same webhook secret you saved here, and turn on <strong>payment.captured</strong> and <strong>payment.failed</strong>.
            </p>
            {status?.webhookUrl && (
              <div className="link-row mt">
                <input className="input mono" readOnly value={status.webhookUrl} onFocus={(e) => e.target.select()} />
                <button className="btn" onClick={copyWebhook}>
                  <Copy size={15} />
                  Copy
                </button>
              </div>
            )}
            <p className="muted mt">
              Razorpay can only reach a public address. Until the app is deployed, payments still complete through the
              browser, but the webhook needs a public URL such as one from ngrok.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}