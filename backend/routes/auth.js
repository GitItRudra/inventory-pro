const router = require('express').Router();
const User = require('../models/User');
const Shop = require('../models/Shop');
const Invite = require('../models/Invite');
const { protect } = require('../middleware/auth');
const { publicUser, sessionFor } = require('../utils/session');
const verifyGoogle = require('../utils/google');
const httpError = require('../utils/httpError');
const { normalizePhone, isValidPhone } = require('../utils/phone');

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS) || 14;
const trialEnds = () => new Date(Date.now() + TRIAL_DAYS * 86400000);

async function createShopWithOwner({ shopName, gstin, owner }) {
  const shop = await Shop.create({
    name: shopName,
    gstin,
    plan: { status: 'trialing', trialEndsAt: trialEnds() },
  });
  const user = await User.create({ ...owner, shopId: shop._id, role: 'owner', isActive: true });
  shop.createdBy = user._id;
  await shop.save();
  return user;
}

router.post('/register-shop', async (req, res) => {
  const { name, email, password, shopName, gstin } = req.body;
  if (!name || !email || !password || !shopName) {
    throw httpError(400, 'Name, email, password and shop name are required');
  }
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');

  const normalized = String(email).toLowerCase().trim();
  if (await User.exists({ email: normalized })) {
    throw httpError(409, 'An account with this email already exists');
  }

  const user = await createShopWithOwner({
    shopName,
    gstin,
    owner: { name, email: normalized, password },
  });
  res.status(201).json(await sessionFor(user));
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw httpError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw httpError(403, 'Your access has been disabled. Ask your shop owner.');
  res.json(await sessionFor(user));
});

// Staff sign in with mobile number and PIN. No email or smartphone needed.
router.post('/pin-login', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const pin = String(req.body.pin || '');
  if (!isValidPhone(phone) || !/^\d{6}$/.test(pin)) {
    throw httpError(400, 'Enter your 10-digit mobile number and 6-digit PIN');
  }

  const user = await User.findOne({ phone }).select('+pinHash +failedPinAttempts +pinLockedUntil');
  if (!user) throw httpError(401, 'Mobile number or PIN is incorrect');
  if (user.isPinLocked()) {
    throw httpError(423, 'Too many wrong attempts. Try again in 15 minutes or ask your manager to reset your PIN.');
  }

  const ok = await user.checkPin(pin);
  if (!ok) throw httpError(401, 'Mobile number or PIN is incorrect');
  if (!user.isActive) throw httpError(403, 'Your access has been disabled. Ask your shop owner.');
  res.json(await sessionFor(user));
});

// Sets a new PIN. First-time PINs (mustSetPin) need no current PIN; later changes do.
router.post('/set-pin', protect, async (req, res) => {
  const pin = String(req.body.pin || '');
  if (!/^\d{6}$/.test(pin)) throw httpError(400, 'PIN must be exactly 6 digits');

  const user = await User.findById(req.user._id).select('+pinHash +failedPinAttempts +pinLockedUntil');
  const needsCurrent = !user.mustSetPin && Boolean(user.pinHash);
  if (needsCurrent) {
    const ok = await user.checkPin(String(req.body.currentPin || ''));
    if (!ok) throw httpError(401, 'Current PIN is incorrect');
  }

  await user.setPin(pin, { requireChange: false });
  await user.save();
  res.json({ user: await publicUser(user) });
});

router.post('/google', async (req, res) => {
  const g = await verifyGoogle(req.body.credential);

  let user = await User.findOne({ $or: [{ googleId: g.sub }, { email: g.email }] });

  if (user) {
    if (!user.googleId) {
      user.googleId = g.sub;
      user.avatar = user.avatar || g.picture;
      await user.save();
    }
    if (!user.isActive) throw httpError(403, 'Your access has been disabled. Ask your shop owner.');
    return res.json(await sessionFor(user));
  }

  const invite = await Invite.findOne({
    email: g.email,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort('-createdAt');

  if (!invite) {
    return res.status(409).json({
      code: 'NEEDS_SHOP',
      message: 'No shop is linked to this Google account yet. Create a shop, or ask your owner for an invite.',
    });
  }

  user = await User.create({
    name: g.name,
    email: g.email,
    googleId: g.sub,
    avatar: g.picture,
    shopId: invite.shopId,
    role: invite.role,
    isActive: true,
  });
  invite.acceptedAt = new Date();
  await invite.save();
  res.status(201).json(await sessionFor(user));
});

router.post('/google-register', async (req, res) => {
  const g = await verifyGoogle(req.body.credential);
  const { shopName, gstin } = req.body;

  if (await User.exists({ email: g.email })) {
    throw httpError(409, 'An account with this email already exists. Sign in instead.');
  }
  if (!shopName) throw httpError(400, 'Shop name is required');

  const user = await createShopWithOwner({
    shopName,
    gstin,
    owner: { name: g.name, email: g.email, googleId: g.sub, avatar: g.picture },
  });
  res.status(201).json(await sessionFor(user));
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: await publicUser(req.user) });
});

module.exports = router;