require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Sale = require('../models/Sale');
const StockMovement = require('../models/StockMovement');

// Stage 2 assigns all existing data to the single shop that exists today.
// It refuses to run if there is more than one shop, to avoid guessing the owner.
const TARGETS = [Product, Category, Sale, StockMovement];

(async () => {
  await connectDB();
  const db = mongoose.connection.db;

  const shops = await Shop.find().sort('createdAt');
  if (shops.length !== 1) {
    console.log(`Expected exactly 1 shop but found ${shops.length}. Stopping so nothing is assigned to the wrong shop.`);
    process.exit(1);
  }
  const shopId = shops[0]._id;
  console.log(`Assigning existing data to "${shops[0].name}"`);

  const counters = await db.collection('counters').find({ _id: { $regex: '^invoice-' } }).toArray();
  const unassigned = [];
  for (const M of TARGETS) {
    unassigned.push(await M.countDocuments({ shopId: { $exists: false } }));
  }
  const nothingToAssign = unassigned.every((n) => n === 0);

  if (nothingToAssign && counters.length === 0) {
    console.log('Already migrated. Nothing to do.');
    process.exit(0);
  }

  for (const M of TARGETS) {
    const result = await M.updateMany({ shopId: { $exists: false } }, { $set: { shopId } });
    console.log(`${M.modelName}: linked ${result.modifiedCount} records`);
  }

  // Invoice counters move from "invoice-YYYYMMDD" to "<shopId>:invoice-YYYYMMDD",
  // so a new shop can never reuse a number this shop has already issued.
  for (const c of counters) {
    await db.collection('counters').updateOne(
      { _id: `${shopId}:${c._id}` },
      { $set: { seq: c.seq } },
      { upsert: true }
    );
    await db.collection('counters').deleteOne({ _id: c._id });
  }
  console.log(`Moved ${counters.length} invoice counters to the shop.`);

  // Replaces the old global unique indexes (sku, invoiceNo, category name) with per-shop ones.
  for (const M of TARGETS) {
    const dropped = await M.syncIndexes();
    const note = dropped.length ? `, dropped ${dropped.join(', ')}` : '';
    console.log(`${M.modelName}: indexes synced${note}`);
  }

  console.log('Stage 2 migration complete.');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});