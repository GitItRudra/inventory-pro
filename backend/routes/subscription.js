const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Shop = require('../models/Shop');
const { protect, requireOwner } = require('../middleware/auth');
const httpError = require('../utils/httpError');

const DAY = 86400000;
const GRACE_DAYS = Number(process.env.GRACE_DAYS) || 3;
const PRICE_RUPEES = 499;

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function platformRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw httpError(501, 'Platform Razorpay keys are not configured on the server');
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// Razorpay calls this, so it has no login. It is defined before router.use(protect)
// so that protect does not run on it. The signature is the only check.
router.post('/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET;
  if (!secret) return res.status(501).json({ message: 'Webhook secret not configured' });

  const signature = req.headers['x-razorpay-signature'] || '';
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!safeEqual(expected, signature)) return res.status(400).json({ message: 'Invalid signature' });

  const event = JSON.parse(req.body.toString('utf8'));
  const sub = event.payload?.subscription?.entity;
  if (!sub?.id) return res.json({ received: true });

  const shop = await Shop.findOne({ 'plan.razorpaySubscriptionId': sub.id });
  if (!shop) return res.json({ received: true });

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
      shop.plan.status = 'active';
      shop.plan.graceUntil = undefined;
      if (sub.current_end) shop.plan.currentPeriodEnd = new Date(sub.current_end * 1000);
      break;
    case 'subscription.pending':
    case 'subscription.halted':
      if (shop.plan.status !== 'past_due') {
        shop.plan.graceUntil = new Date(Date.now() + GRACE_DAYS * DAY);
      }
      shop.plan.status = 'past_due';
      break;
    case 'subscription.cancelled':
    case 'subscription.completed':
      shop.plan.status = 'cancelled';
      break;
    default:
      return res.json({ received: true });
  }

  await shop.save();
  res.json({ received: true });
});

router.use(protect, requireOwner);

router.get('/', (req, res) => {
  res.json({
    plan: req.shop.planInfo(),
    subscribed: Boolean(req.shop.plan.razorpaySubscriptionId),
    priceRupees: PRICE_RUPEES,
    graceDays: GRACE_DAYS,
  });
});

// Creates a Razorpay subscription for this shop and returns what the checkout popup needs.
router.post('/start', async (req, res) => {
  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) throw httpError(501, 'RAZORPAY_PLAN_ID is not set on the server');

  const shop = req.shop;
  if (shop.plan.status === 'active' && shop.hasAccess()) {
    throw httpError(400, 'Your subscription is already active');
  }

  const sub = await platformRazorpay().subscriptions.create({
    plan_id: planId,
    total_count: 120,
    customer_notify: 1,
    notes: { shopId: String(shop._id) },
  });

  shop.plan.razorpaySubscriptionId = sub.id;
  await shop.save();

  res.json({
    subscriptionId: sub.id,
    keyId: process.env.RAZORPAY_KEY_ID,
    shopName: shop.name,
    name: req.user.name,
    email: req.user.email,
  });
});

// Called by the browser after the checkout popup reports success.
// The webhook confirms renewals later; this makes the first payment take effect at once.
router.post('/verify', async (req, res) => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;
  const shop = req.shop;

  if (!razorpay_subscription_id || shop.plan.razorpaySubscriptionId !== razorpay_subscription_id) {
    throw httpError(400, 'This subscription does not belong to your shop');
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest('hex');
  if (!safeEqual(expected, razorpay_signature || '')) {
    throw httpError(400, 'Payment signature could not be verified');
  }

  shop.plan.status = 'active';
  shop.plan.graceUntil = undefined;
  if (!shop.plan.currentPeriodEnd || shop.plan.currentPeriodEnd < new Date()) {
    shop.plan.currentPeriodEnd = new Date(Date.now() + 31 * DAY);
  }
  await shop.save();
  res.json({ plan: shop.planInfo() });
});

// Cancels at the end of the current billing period, so the shop keeps access it has paid for.
router.post('/cancel', async (req, res) => {
  const subId = req.shop.plan.razorpaySubscriptionId;
  if (!subId) throw httpError(400, 'There is no subscription to cancel');

  await platformRazorpay().subscriptions.cancel(subId, 1);
  res.json({ message: 'Your subscription will end at the close of the current billing period.' });
});

module.exports = router;