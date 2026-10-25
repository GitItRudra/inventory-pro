require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Shop = require('../models/Shop');

(async () => {
  await connectDB();

  if (await User.exists({ shopId: { $exists: true, $ne: null } })) {
    console.log('Users already have shops. Nothing to migrate.');
    process.exit(0);
  }

  // The old schema stored shopName on each user, so read it from the raw collection.
  const legacyOwner = await User.collection.findOne({ role: 'owner' });
  if (!legacyOwner) {
    console.log('No owner found. Create a shop from the signup page instead.');
    process.exit(0);
  }

  const shop = await Shop.create({
    name: legacyOwner.shopName || 'My Shop',
    plan: { status: 'active' },
    createdBy: legacyOwner._id,
  });

  const result = await User.updateMany({ shopId: { $exists: false } }, { $set: { shopId: shop._id } });
  console.log(`Created shop "${shop.name}" and linked ${result.modifiedCount} users.`);
  console.log('Products and sales are migrated in stage 2.');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});