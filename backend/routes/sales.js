const router = require('express').Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Counter = require('../models/Counter');
const StockMovement = require('../models/StockMovement');
const { protect } = require('../middleware/auth');
const httpError = require('../utils/httpError');
const { can } = require('../utils/permissions');

const round2 = (n) => Math.round(n * 100) / 100;
const PAYMENT_MODES = ['cash', 'upi', 'card', 'credit', 'online'];

const REVENUE_MATCH = {
  status: { $ne: 'cancelled' },
  paymentStatus: { $nin: ['pending', 'failed'] },
};

router.use(protect);

// Counter key includes the shop, so each shop numbers its own invoices from 1 each day.
async function nextInvoiceNo(shopId) {
  const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).replace(/-/g, '');
  const counter = await Counter.findByIdAndUpdate(
    `${shopId}:invoice-${ymd}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${ymd}-${String(counter.seq).padStart(4, '0')}`;
}

router.post('/', async (req, res) => {
  const shopId = req.shop._id;
  const { items, customerName, customerPhone } = req.body;
  const paymentMode = PAYMENT_MODES.includes(req.body.paymentMode) ? req.body.paymentMode : 'cash';
  const isOnline = paymentMode === 'online';

  if (isOnline && !req.shop.payments?.configuredAt) {
    throw httpError(501, 'Add your Razorpay keys in Settings before taking online payments');
  }
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, 'Add at least one item to the bill');

  const qtyById = new Map();
  for (const it of items) {
    const q = Number(it.quantity);
    if (!Number.isInteger(q) || q < 1) throw httpError(400, 'Quantities must be whole numbers above zero');
    qtyById.set(String(it.productId), (qtyById.get(String(it.productId)) || 0) + q);
  }

  const products = await Product.find({ _id: { $in: [...qtyById.keys()] }, shopId });
  if (products.length !== qtyById.size) throw httpError(404, 'One or more products no longer exist');

  const lines = products.map((p) => {
    const quantity = qtyById.get(String(p._id));
    const lineTotal = round2(p.sellingPrice * quantity);
    const taxableValue = round2(lineTotal / (1 + p.gstRate / 100));
    return {
      product: p._id, name: p.name, sku: p.sku, quantity,
      unitPrice: p.sellingPrice, gstRate: p.gstRate,
      taxableValue, taxAmount: round2(lineTotal - taxableValue), lineTotal,
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0));

  // Discount limit is checked before any stock moves, so nothing needs rolling back.
  const requestedDiscount = Math.max(0, Number(req.body.discount) || 0);
  if (requestedDiscount > 0 && !can(req.user.role, 'discount.unlimited')) {
    const limit = req.shop.settings?.cashierMaxDiscountPct ?? 5;
    const pct = subtotal > 0 ? (requestedDiscount / subtotal) * 100 : 0;
    if (pct > limit + 0.001) throw httpError(403, `Your discount limit is ${limit}% of the bill`);
  }
  const discount = Math.min(requestedDiscount, subtotal);

  const applied = [];
  const rollback = () =>
    Promise.all(
      applied.map(({ line }) =>
        Product.updateOne({ _id: line.product, shopId }, { $inc: { quantity: line.quantity } })
      )
    );

  try {
    for (const line of lines) {
      const updated = await Product.findOneAndUpdate(
        { _id: line.product, shopId, quantity: { $gte: line.quantity } },
        { $inc: { quantity: -line.quantity } },
        { new: true }
      );
      if (!updated) throw httpError(409, `Not enough stock for ${line.name}`);
      applied.push({ line, balanceAfter: updated.quantity });
    }

    const sale = await Sale.create({
      shopId,
      invoiceNo: await nextInvoiceNo(shopId),
      customerName: String(customerName || '').trim() || undefined,
      customerPhone: String(customerPhone || '').trim(),
      items: lines,
      subtotal,
      taxTotal,
      discount,
      grandTotal: round2(subtotal - discount),
      paymentMode,
      paymentStatus: isOnline ? 'pending' : 'paid',
      paidAt: isOnline ? undefined : new Date(),
      createdBy: req.user._id,
    });

    await StockMovement.insertMany(
      applied.map(({ line, balanceAfter }) => ({
        shopId,
        product: line.product,
        type: 'sale',
        quantity: -line.quantity,
        balanceAfter,
        reason: isOnline ? 'Sold (payment pending)' : 'Sold',
        reference: sale.invoiceNo,
        performedBy: req.user._id,
      }))
    );

    res.status(201).json(sale);
  } catch (err) {
    await rollback();
    throw err;
  }
});

router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));

  const filter = { shopId: req.shop._id };
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00+05:30`);
  if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999+05:30`);

  const [items, total, agg] = await Promise.all([
    Sale.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Sale.countDocuments(filter),
    Sale.aggregate([
      { $match: { ...filter, ...REVENUE_MATCH } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' } } },
    ]),
  ]);
  res.json({
    items, total, page, pages: Math.ceil(total / limit) || 1,
    totalRevenue: agg[0]?.revenue || 0,
  });
});

router.get('/:id', async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, shopId: req.shop._id });
  if (!sale) throw httpError(404, 'Invoice not found');
  res.json(sale);
});

// Paid bills need the sales.cancelPaid permission and a reason. Online payments must be
// refunded from the Razorpay dashboard. Pending bills can be cancelled by any cashier.
router.post('/:id/cancel', async (req, res) => {
  const shopId = req.shop._id;
  const sale = await Sale.findOne({ _id: req.params.id, shopId });
  if (!sale) throw httpError(404, 'Invoice not found');
  if (sale.status === 'cancelled') throw httpError(400, 'This invoice is already cancelled');

  const reason = String(req.body.reason || '').trim();
  if (sale.paymentStatus === 'paid') {
    if (sale.paymentMode === 'online') {
      throw httpError(400, 'This online payment is already captured. Refund it from the Razorpay dashboard first.');
    }
    if (!can(req.user.role, 'sales.cancelPaid')) {
      throw httpError(403, 'Only the owner or a manager can cancel a paid bill');
    }
    if (!reason) throw httpError(400, 'Enter a reason for cancelling a paid bill');
  }

  sale.status = 'cancelled';
  sale.cancelReason = reason || undefined;
  sale.cancelledBy = req.user._id;
  sale.cancelledAt = new Date();
  await sale.save();

  for (const item of sale.items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, shopId },
      { $inc: { quantity: item.quantity } },
      { new: true }
    );
    if (updated) {
      await StockMovement.create({
        shopId,
        product: item.product,
        type: 'in',
        quantity: item.quantity,
        balanceAfter: updated.quantity,
        reason: `Bill cancelled${reason ? `: ${reason}` : ''}`,
        reference: sale.invoiceNo,
        performedBy: req.user._id,
      });
    }
  }

  res.json(sale);
});

module.exports = router;