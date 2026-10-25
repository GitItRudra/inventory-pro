const router = require('express').Router();
const Shop = require('../models/Shop');
const { protect, requireOwner } = require('../middleware/auth');
const httpError = require('../utils/httpError');
const pick = require('../utils/pick');

router.use(protect);

router.get('/', (req, res) => {
  res.json({ shop: req.shop, plan: req.shop.planInfo() });
});

// Owner only. Sets the shop name details and the cashier discount limit.
router.patch('/', requireOwner, async (req, res) => {
  const updates = pick(req.body, ['name', 'gstin', 'address', 'phone']);
  if (req.body.cashierMaxDiscountPct !== undefined) {
    const pct = Number(req.body.cashierMaxDiscountPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw httpError(400, 'Discount limit must be between 0 and 100');
    }
    updates['settings.cashierMaxDiscountPct'] = pct;
  }
  const shop = await Shop.findByIdAndUpdate(req.shop._id, updates, { new: true, runValidators: true });
  res.json({ shop, plan: shop.planInfo() });
});

module.exports = router;