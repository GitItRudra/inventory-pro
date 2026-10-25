const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Sale = require('../models/Sale');
const Shop = require('../models/Shop');
const { protect } = require('../middleware/auth');
const httpError = require('../utils/httpError');
const { decrypt } = require('../utils/crypto');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Loads the shop's own Razorpay keys. Money goes to the shop's account, not the platform's.
async function keysForShop(shopId) {
  const shop = await Shop.findById(shopId).select('+payments.keySecretEnc');
  if (!shop?.payments?.configuredAt) {
    throw httpError(501, 'Online payments are not set up for this shop. Add your Razorpay keys in Settings.');
  }
  return { keyId: shop.payments.keyId, keySecret: decrypt(shop.payments.keySecretEnc) };
}

// Marks a sale as paid once. Safe to call twice (verify and webhook can both fire).
async function markPaid(sale, paymentId) {
  if (sale.paymentStatus === 'paid') return sale;
  sale.paymentStatus = 'paid';
  sale.razorpayPaymentId = paymentId;
  sale.paidAt = new Date();
  await sale.save();
  return sale;
}

router.post('/order', protect, async (req, res) => {
  const sale = await Sale.findOne({ _id: req.body.saleId, shopId: req.shop._id });
  if (!sale) throw httpError(404, 'Invoice not found');
  if (sale.status === 'cancelled') throw httpError(400, 'This invoice was cancelled');
  if (sale.paymentStatus === 'paid') throw httpError(400, 'This invoice is already paid');

  const { keyId, keySecret } = await keysForShop(req.shop._id);
  const amount = Math.round(sale.grandTotal * 100);

  if (!sale.razorpayOrderId) {
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount,
      currency: 'INR',
      receipt: sale.invoiceNo,
      notes: { saleId: String(sale._id) },
    });
    sale.razorpayOrderId = order.id;
    await sale.save();
  }

  res.json({
    keyId,
    orderId: sale.razorpayOrderId,
    amount,
    currency: 'INR',
    invoiceNo: sale.invoiceNo,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
  });
});

router.post('/verify', protect, async (req, res) => {
  const { saleId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sale = await Sale.findOne({ _id: saleId, shopId: req.shop._id });
  if (!sale || sale.razorpayOrderId !== razorpay_order_id) {
    throw httpError(400, 'This payment does not match the invoice');
  }

  const { keySecret } = await keysForShop(req.shop._id);
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (!safeEqual(expected, razorpay_signature || '')) {
    throw httpError(400, 'Payment signature could not be verified');
  }

  res.json(await markPaid(sale, razorpay_payment_id));
});

// Each shop has its own webhook URL, shown in Settings. Its secret is checked before anything changes.
router.post('/webhook/:shopId', async (req, res) => {
  const shop = await Shop.findById(req.params.shopId).select('+payments.webhookSecretEnc');
  if (!shop?.payments?.webhookSecretEnc) return res.status(404).json({ message: 'Unknown shop' });

  const secret = decrypt(shop.payments.webhookSecretEnc);
  const signature = req.headers['x-razorpay-signature'] || '';
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!safeEqual(expected, signature)) return res.status(400).json({ message: 'Invalid signature' });

  const event = JSON.parse(req.body.toString('utf8'));
  const payment = event.payload?.payment?.entity;

  if (payment?.order_id) {
    const sale = await Sale.findOne({ shopId: shop._id, razorpayOrderId: payment.order_id });
    if (sale) {
      if (event.event === 'payment.captured') {
        await markPaid(sale, payment.id);
      } else if (event.event === 'payment.failed' && sale.paymentStatus !== 'paid') {
        sale.paymentStatus = 'failed';
        await sale.save();
      }
    }
  }
  res.json({ received: true });
});

module.exports = router;