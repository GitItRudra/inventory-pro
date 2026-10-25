const router = require('express').Router();
const Invite = require('../models/Invite');
const User = require('../models/User');
const { protect, requireOwner } = require('../middleware/auth');
const httpError = require('../utils/httpError');
const { newToken, hashToken } = require('../utils/tokens');

const INVITE_DAYS = 7;
const ROLES = ['cashier', 'manager', 'owner'];

router.use(protect, requireOwner);

router.get('/', async (req, res) => {
  const invites = await Invite.find({
    shopId: req.shop._id,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort('-createdAt')
    .select('-tokenHash');
  res.json(invites);
});

router.post('/', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const role = req.body.role || 'cashier';

  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'Enter a valid email address');
  if (!ROLES.includes(role)) throw httpError(400, 'Invalid role');
  if (await User.exists({ email })) throw httpError(409, 'This email already has an account');

  await Invite.deleteMany({ shopId: req.shop._id, email, acceptedAt: null });

  const token = newToken();
  const invite = await Invite.create({
    shopId: req.shop._id,
    email,
    role,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + INVITE_DAYS * 86400000),
    invitedBy: req.user._id,
  });

  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  res.status(201).json({
    invite: { _id: invite._id, email, role, expiresAt: invite.expiresAt },
    link: `${base}/invite/${token}`,
  });
});

router.delete('/:id', async (req, res) => {
  const result = await Invite.deleteOne({ _id: req.params.id, shopId: req.shop._id });
  if (!result.deletedCount) throw httpError(404, 'Invite not found');
  res.json({ message: 'Invite revoked' });
});

module.exports = router;