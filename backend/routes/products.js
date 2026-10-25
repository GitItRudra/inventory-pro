const router = require('express').Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const StockMovement = require('../models/StockMovement');
const { protect, requireOwner } = require('../middleware/auth');
const httpError = require('../utils/httpError');
const pick = require('../utils/pick');
const { can } = require('../utils/permissions');

const PRODUCT_FIELDS = [
  'name', 'sku', 'barcode', 'category', 'description', 'hsnCode', 'unit',
  'costPrice', 'sellingPrice', 'gstRate', 'reorderLevel', 'location',
];
const SORTS = ['name', '-name', 'quantity', '-quantity', 'sellingPrice', '-sellingPrice', '-createdAt'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.use(protect);

// A category must belong to the same shop as the product.
async function assertCategory(shopId, id) {
  if (!id) return null;
  const ok = await Category.exists({ _id: id, shopId });
  if (!ok) throw httpError(400, 'That category does not exist in your shop');
  return id;
}

router.get('/export/csv', async (req, res) => {
  if (!can(req.user.role, 'products.manage')) throw httpError(403, 'Your role cannot export the inventory');
  const products = await Product.find({ shopId: req.shop._id }).populate('category', 'name').sort('name');
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Name', 'SKU', 'Category', 'HSN', 'Unit', 'Cost Price', 'Selling Price', 'GST %', 'Quantity', 'Reorder Level', 'Location', 'Stock Value (cost)'];
  const rows = products.map((p) =>
    [
      p.name, p.sku, p.category?.name, p.hsnCode, p.unit, p.costPrice, p.sellingPrice,
      p.gstRate, p.quantity, p.reorderLevel, p.location, (p.costPrice * p.quantity).toFixed(2),
    ].map(esc).join(',')
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
  res.send([header.join(','), ...rows].join('\n'));
});

router.get('/', async (req, res) => {
  const { search = '', category, status, sort = '-createdAt' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = { shopId: req.shop._id };
  if (search) {
    const rx = new RegExp(escapeRegex(String(search).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { barcode: rx }];
  }
  if (category) filter.category = category;
  if (status === 'low') filter.$expr = { $lte: ['$quantity', '$reorderLevel'] };
  if (status === 'out') filter.quantity = 0;

  const [docs, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .sort(SORTS.includes(sort) ? sort : '-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  // Cashiers never receive cost prices.
  const items = can(req.user.role, 'cost.view')
    ? docs
    : docs.map((p) => {
        const obj = p.toJSON();
        delete obj.costPrice;
        return obj;
      });

  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

router.post('/', async (req, res) => {
  const data = pick(req.body, PRODUCT_FIELDS);
  data.category = await assertCategory(req.shop._id, data.category || null);
  const opening = Math.max(0, Math.floor(Number(req.body.quantity) || 0));

  const product = await Product.create({
    ...data,
    shopId: req.shop._id,
    quantity: opening,
    createdBy: req.user._id,
  });
  if (opening > 0) {
    await StockMovement.create({
      shopId: req.shop._id,
      product: product._id,
      type: 'in',
      quantity: opening,
      balanceAfter: opening,
      reason: 'Opening stock',
      performedBy: req.user._id,
    });
  }
  res.status(201).json(product);
});

router.put('/:id', async (req, res) => {
  const data = pick(req.body, PRODUCT_FIELDS);
  if (data.category !== undefined) data.category = await assertCategory(req.shop._id, data.category || null);
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, shopId: req.shop._id },
    data,
    { new: true, runValidators: true }
  );
  if (!product) throw httpError(404, 'Product not found');
  res.json(product);
});

router.delete('/:id', requireOwner, async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
  if (!product) throw httpError(404, 'Product not found');
  res.json({ message: 'Product deleted' });
});

module.exports = router;