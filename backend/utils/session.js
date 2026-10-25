const Shop = require('../models/Shop');
const { signToken } = require('../middleware/auth');

// The user object sent to the frontend includes the shop name and plan,
// so existing screens that read user.shopName keep working.
async function publicUser(user) {
  const shop = await Shop.findById(user.shopId);
  return { ...user.toSafe(), shopName: shop?.name, plan: shop?.planInfo() };
}

async function sessionFor(user) {
  return { token: signToken(user._id), user: await publicUser(user) };
}

module.exports = { publicUser, sessionFor };