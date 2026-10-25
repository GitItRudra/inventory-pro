const router = require('express').Router();
const Razorpay = require('razorpay');
const Shop = require('../models/Shop');
const { protect, requireOwner } = require('../middleware/auth');
const httpError = require('../utils/httpError');
const { encrypt } = require('../utils/crypto');

router.use(protect, requireOwner);

const webhookUrl = (shopId) =>
  `${process.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/payments/webhook/${shopId}`;

router.get('/', (req, res) => {
  res.json({
    configured: Boolean(req.shop.payments?.configuredAt),
    keyId: req.shop.payments?.keyId || null,
    webhookUrl: webhookUrl(req.shop._id),
  });
});

router.put('/', async (req, res) => {
  const keyId = String(req.body.keyId || '').trim();
  const keySecret = String(req.body.keySecret || '').trim();
  const webhookSecret = String(req.body.webhookSecret || '').trim();

  if (!/^rzp_(test|live)_/.test(keyId)) throw httpError(400, 'Key ID should start with rzp_test_ or rzp_live_');
  if (!keySecret) throw httpError(400, 'Key Secret is required');
  if (!webhookSecret) throw httpError(400, 'Webhook secret is required. Choose one in Razorpay > Webhooks and enter it here.');

  // Confirm the keys work before saving them.
  try {
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    await rzp.orders.all({ count: 1 });
  } catch {
    throw httpError(400, 'Razorpay rejected these keys. Check the Key ID and Key Secret.');
  }

  await Shop.updateOne(
    { _id: req.shop._id },
    {
      $set: {
        'payments.keyId': keyId,
        'payments.keySecretEnc': encrypt(keySecret),
        'payments.webhookSecretEnc': encrypt(webhookSecret),
        'payments.configuredAt': new Date(),
      },
    }
  );

  res.json({ configured: true, keyId, webhookUrl: webhookUrl(req.shop._id) });
});

router.delete('/', async (req, res) => {
  await Shop.updateOne({ _id: req.shop._id }, { $unset: { payments: 1 } });
  res.json({ configured: false });
});

module.exports = router;