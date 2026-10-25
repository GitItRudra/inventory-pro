const router = require('express').Router();
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { protect } = require('../middleware/auth');
const httpError = require('../utils/httpError');

router.use(protect);

router.post('/adjust', async (req, res) => {
  const shopId = req.shop._id;
  const { productId, type } = req.body;
  const reason = String(req.body.reason || '').trim();
  const qty = Number(req.body.quantity);
  if (!['in', 'out', 'adjust'].includes(type)) throw httpError(400, 'Invalid adjustment type');
  if (!Number.isFinite(qty) || qty < 0) throw httpError(400, 'Quantity must be zero or more');

  const before = await Product.findOne({ _id: productId, shopId });
  if (!before) throw httpError(404, 'Product not found');

  let after;
  let delta;
  if (type === 'in') {
    delta = qty;
    after = await Product.findOneAndUpdate({ _id: productId, shopId }, { $inc: { quantity: qty } }, { new: true });
  } else if (type === 'out') {
    delta = -qty;
    after = await Product.findOneAndUpdate(
      { _id: productId, shopId, quantity: { $gte: qty } },
      { $inc: { quantity: -qty } },
      { new: true }
    );
    if (!after) throw httpError(409, `Only ${before.quantity} ${before.unit} available to remove`);
  } else {
    delta = qty - before.quantity;
    after = await Product.findOneAndUpdate({ _id: productId, shopId }, { $set: { quantity: qty } }, { new: true });
  }

  const movement = await StockMovement.create({
    shopId,
    product: productId,
    type,
    quantity: delta,
    balanceAfter: after.quantity,
    reason,
    performedBy: req.user._id,
  });
  res.status(201).json({ product: after, movement });
});

router.get('/movements', async (req, res) => {
  const { productId, type } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = { shopId: req.shop._id };
  if (productId) filter.product = productId;
  if (type) filter.type = type;

  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('product', 'name sku unit')
      .populate('performedBy', 'name'),
    StockMovement.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

module.exports = router;