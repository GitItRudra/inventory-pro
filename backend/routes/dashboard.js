const router = require('express').Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const { protect } = require('../middleware/auth');

const TZ = 'Asia/Kolkata';
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const REVENUE_MATCH = {
  status: { $ne: 'cancelled' },
  paymentStatus: { $nin: ['pending', 'failed'] },
};

router.use(protect);

router.get('/summary', async (req, res) => {
  const shopId = req.shop._id;
  const dayKeys = Array.from({ length: 7 }, (_, i) => ymd(new Date(Date.now() - (6 - i) * 86400000)));
  const todayStart = new Date(`${dayKeys[6]}T00:00:00+05:30`);
  const weekStart = new Date(`${dayKeys[0]}T00:00:00+05:30`);

  const [productStats, todayAgg, daily, topProducts, lowStockItems, recentSales] = await Promise.all([
    Product.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: null,
          products: { $sum: 1 },
          units: { $sum: '$quantity' },
          stockValue: { $sum: { $multiply: ['$costPrice', '$quantity'] } },
          lowStock: { $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] } },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { ...REVENUE_MATCH, shopId, createdAt: { $gte: todayStart } } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: { ...REVENUE_MATCH, shopId, createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
          revenue: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { ...REVENUE_MATCH, shopId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          qty: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
    Product.find({ shopId, $expr: { $lte: ['$quantity', '$reorderLevel'] } })
      .sort('quantity')
      .limit(6)
      .select('name sku quantity reorderLevel unit'),
    Sale.find({ shopId, status: { $ne: 'cancelled' } })
      .sort('-createdAt')
      .limit(6)
      .select('invoiceNo grandTotal customerName createdAt paymentStatus paymentMode'),
  ]);

  const dailyMap = Object.fromEntries(daily.map((d) => [d._id, d]));
  const last7Days = dayKeys.map((k) => ({
    _id: k,
    revenue: dailyMap[k]?.revenue || 0,
    count: dailyMap[k]?.count || 0,
  }));
  const stats = productStats[0] || {};

  res.json({
    totals: {
      products: stats.products || 0,
      units: stats.units || 0,
      stockValue: req.user.role === 'cashier' ? null : Math.round((stats.stockValue || 0) * 100) / 100,
      lowStock: stats.lowStock || 0,
      outOfStock: stats.outOfStock || 0,
    },
    today: { revenue: todayAgg[0]?.revenue || 0, count: todayAgg[0]?.count || 0 },
    last7Days,
    topProducts,
    lowStockItems,
    recentSales,
  });
});

module.exports = router;