import { useState } from 'react';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { dateOnly } from '../utils/format';

const STATUS_TEXT = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment failed',
  cancelled: 'Cancelled',
};

const fmt = (d) => (d ? dateOnly(d) : '-');

export default function Subscription() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const plan = user?.plan || {};

  const refresh = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
  };

  const subscribe = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/subscription/start');
      if (!window.Razorpay) throw new Error('The payment window did not load. Refresh the page and try again.');

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Inventory Pro',
        description: `Monthly plan for ${data.shopName}`,
        prefill: { name: data.name, email: data.email || undefined },
        theme: { color: '#B4532A' },
        handler: async (r) => {
          try {
            await api.post('/subscription/verify', {
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_subscription_id: r.razorpay_subscription_id,
              razorpay_signature: r.razorpay_signature,
            });
            await refresh();
            setNotice('Subscription active. Thank you!');
          } catch (err) {
            setError(getErrorMessage(err));
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on('payment.failed', (r) => {
        setError(r?.error?.description || 'Payment failed. Please try again.');
        setBusy(false);
      });
      rzp.open();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel the subscription? Access continues until the end of the current billing period.')) return;
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/subscription/cancel');
      setNotice(data.message);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const canSubscribe = plan.status !== 'active' || !plan.hasAccess;
  const isSubscribed = plan.status === 'active' && plan.hasAccess;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Subscription</h1>
          <p>Your shop plan is ₹499 a month after the free trial.</p>
        </div>
      </div>

      {notice && <div className="alert success">{notice}</div>}
      {error && <div className="alert">{error}</div>}

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Your plan</h2>
            <span className={`badge ${plan.hasAccess ? 'ok' : 'out'}`}>
              {STATUS_TEXT[plan.status] || 'Unknown'}
            </span>
          </div>
          <div className="card-body">
            <table className="table">
              <tbody>
                <tr><td>Access</td><td className="num">{plan.hasAccess ? 'Full access' : 'Read-only'}</td></tr>
                <tr><td>Trial ends</td><td className="num">{fmt(plan.trialEndsAt)}</td></tr>
                <tr><td>Current period ends</td><td className="num">{fmt(plan.currentPeriodEnd)}</td></tr>
                {plan.status === 'past_due' && (
                  <tr><td>Full access until</td><td className="num">{fmt(plan.graceUntil)}</td></tr>
                )}
              </tbody>
            </table>

            <div className="actions mt">
              {canSubscribe && (
                <button className="btn primary" onClick={subscribe} disabled={busy}>
                  {busy ? 'Opening checkout...' : 'Subscribe for ₹499 a month'}
                </button>
              )}
              {isSubscribed && (
                <button className="btn" onClick={cancel}>Cancel subscription</button>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>How billing works</h2></div>
          <div className="card-body">
            <p className="muted">
              Your plan renews every month through Razorpay. If a renewal fails, you keep full access for 3 days
              while you update your payment method. After that the shop becomes read-only: you can still view sales,
              stock and reports, but cannot bill, edit products or manage the team until you renew.
            </p>
            <p className="muted mt">
              Online payments from your customers go to your own Razorpay account, set up in Settings. They are not
              part of this subscription.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}