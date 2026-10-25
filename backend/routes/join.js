const router = require('express').Router();
const Invite = require('../models/Invite');
const Shop = require('../models/Shop');
const User = require('../models/User');
const httpError = require('../utils/httpError');
const verifyGoogle = require('../utils/google');
const { sessionFor } = require('../utils/session');
const { hashToken } = require('../utils/tokens');

async function findInvite(token) {
  const invite = await Invite.findOne({
    tokenHash: hashToken(token),
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!invite) throw httpError(404, 'This invite link is invalid or has expired. Ask the owner for a new one.');
  return invite;
}

// Shows the shop name and role before the person accepts.
router.get('/:token', async (req, res) => {
  const invite = await findInvite(req.params.token);
  const shop = await Shop.findById(invite.shopId);
  res.json({ email: invite.email, role: invite.role, shopName: shop?.name });
});

// Accepts with either { name, password } or { credential } from Google.
router.post('/:token/accept', async (req, res) => {
  const invite = await findInvite(req.params.token);
  const { name, password, credential } = req.body;

  let profile;
  if (credential) {
    const g = await verifyGoogle(credential);
    if (g.email !== invite.email) {
      throw httpError(403, `This invite was sent to ${invite.email}. Sign in with that Google account.`);
    }
    profile = { name: g.name, googleId: g.sub, avatar: g.picture };
  } else {
    if (!name || !password) throw httpError(400, 'Name and password are required');
    if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
    profile = { name: String(name).trim(), password };
  }

  if (await User.exists({ email: invite.email })) {
    throw httpError(409, 'An account with this email already exists. Sign in instead.');
  }

  const user = await User.create({
    ...profile,
    email: invite.email,
    shopId: invite.shopId,
    role: invite.role,
    isActive: true,
  });

  invite.acceptedAt = new Date();
  await invite.save();

  res.status(201).json(await sessionFor(user));
});

module.exports = router;