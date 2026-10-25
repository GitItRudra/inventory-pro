require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

(async () => {
  await connectDB();
  const db = mongoose.connection.db;

  // Uses the raw collections so the new role enum doesn't block the update.
  const users = await db.collection('users').updateMany({ role: 'staff' }, { $set: { role: 'cashier' } });
  const invites = await db.collection('invites').updateMany({ role: 'staff' }, { $set: { role: 'cashier' } });

  console.log(`Converted ${users.modifiedCount} staff accounts to cashier.`);
  console.log(`Converted ${invites.modifiedCount} pending invites to cashier.`);
  console.log('Promote anyone who should be a manager from the Team page.');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});