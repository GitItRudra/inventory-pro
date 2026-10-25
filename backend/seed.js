require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const StockMovement = require('./models/StockMovement');

(async () => {
  await connectDB();
  if ((await Product.countDocuments()) > 0) {
    console.log('Products already exist. Skipping seed.');
    process.exit(0);
  }

  const owner =
    (await User.findOne({ email: 'demo@inventorypro.app' })) ||
    (await User.create({
      name: 'Demo Owner',
      email: 'demo@inventorypro.app',
      password: 'demo1234',
      shopName: 'Sharma General Store',
    }));

  const cats = await Category.insertMany([
    { name: 'Groceries', description: 'Staples and packaged food' },
    { name: 'Dairy', description: 'Milk, curd, paneer and butter' },
    { name: 'Beverages', description: 'Soft drinks and juices' },
    { name: 'Stationery', description: 'Notebooks, pens and office supplies' },
    { name: 'Personal Care', description: 'Soaps, shampoos and hygiene' },
  ]);
  const cat = Object.fromEntries(cats.map((c) => [c.name, c._id]));

  const items = [
    { name: 'Basmati Rice 5 kg', sku: 'RICE-BAS-5KG', category: 'Groceries', hsnCode: '1006', unit: 'pack', costPrice: 420, sellingPrice: 480, gstRate: 5, quantity: 14, reorderLevel: 5, location: 'Rack A1' },
    { name: 'Toor Dal 1 kg', sku: 'DAL-TOR-1KG', category: 'Groceries', hsnCode: '0713', unit: 'pack', costPrice: 118, sellingPrice: 140, gstRate: 0, quantity: 3, reorderLevel: 8, location: 'Rack A2' },
    { name: 'Sunflower Oil 1 L', sku: 'OIL-SUN-1L', category: 'Groceries', hsnCode: '1512', unit: 'pcs', costPrice: 128, sellingPrice: 156, gstRate: 5, quantity: 24, reorderLevel: 6, location: 'Rack A3' },
    { name: 'Full Cream Milk 1 L', sku: 'MILK-FC-1L', category: 'Dairy', hsnCode: '0401', unit: 'pcs', costPrice: 58, sellingPrice: 68, gstRate: 0, quantity: 0, reorderLevel: 10, location: 'Cooler' },
    { name: 'Paneer 200 g', sku: 'PAN-200G', category: 'Dairy', hsnCode: '0406', unit: 'pack', costPrice: 82, sellingPrice: 99, gstRate: 5, quantity: 9, reorderLevel: 4, location: 'Cooler' },
    { name: 'Cola 750 ml', sku: 'BEV-COLA-750', category: 'Beverages', hsnCode: '2202', unit: 'pcs', costPrice: 32, sellingPrice: 40, gstRate: 28, quantity: 48, reorderLevel: 12, location: 'Rack B1' },
    { name: 'A4 Notebook 200 pages', sku: 'STN-NB-A4', category: 'Stationery', hsnCode: '4820', unit: 'pcs', costPrice: 45, sellingPrice: 60, gstRate: 12, quantity: 30, reorderLevel: 10, location: 'Shelf S2' },
    { name: 'Herbal Soap 100 g', sku: 'SOAP-HRB-100', category: 'Personal Care', hsnCode: '3401', unit: 'pcs', costPrice: 28, sellingPrice: 36, gstRate: 18, quantity: 60, reorderLevel: 15, location: 'Rack C1' },
  ];

  for (const item of items) {
    const { category, quantity, ...rest } = item;
    const product = await Product.create({ ...rest, category: cat[category], quantity, createdBy: owner._id });
    if (quantity > 0) {
      await StockMovement.create({ product: product._id, type: 'in', quantity, balanceAfter: quantity, reason: 'Opening stock', performedBy: owner._id });
    }
  }

  console.log(`Seeded ${items.length} products. Login: demo@inventorypro.app / demo1234`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
