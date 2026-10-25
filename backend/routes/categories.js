const router = require('express').Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const { protect, requireOwner } = require('../middleware/auth');
const httpError = require('../utils/httpError');

router.use(protect);

router.get('/', async (req, res) => {
  const shopId = req.shop._id;
  const [categories, counts] = await Promise.all([
    Category.find({ shopId }).sort('name').lean(),
    Product.aggregate([{ $match: { shopId } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json(categories.map((c) => ({ ...c, productCount: countMap[String(c._id)] || 0 })));
});

router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Category name is required');
  if (await Category.exists({ shopId: req.shop._id, name })) {
    throw httpError(409, 'A category with this name already exists');
  }
  const category = await Category.create({
    shopId: req.shop._id,
    name,
    description: req.body.description,
  });
  res.status(201).json(category);
});

router.delete('/:id', requireOwner, async (req, res) => {
  const inUse = await Product.exists({ shopId: req.shop._id, category: req.params.id });
  if (inUse) throw httpError(400, 'This category still has products. Move or delete them first.');
  const deleted = await Category.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
  if (!deleted) throw httpError(404, 'Category not found');
  res.json({ message: 'Category deleted' });
});

module.exports = router;