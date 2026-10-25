require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const COLLECTIONS = ['users', 'shops', 'products', 'categories', 'sales', 'stockmovements', 'counters', 'invites'];

(async () => {
  await connectDB();
  const db = mongoose.connection.db;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(__dirname, '..', '..', 'backups', stamp);
  fs.mkdirSync(dir, { recursive: true });

  for (const name of COLLECTIONS) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
    console.log(`${name}: ${docs.length} documents`);
  }

  console.log(`Backup saved to ${dir}`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});