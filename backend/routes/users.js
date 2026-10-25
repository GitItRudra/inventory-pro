const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const httpError = require('../utils/httpError');
const { normalizePhone, isValidPhone } = require('../utils/phone');
const { generatePin } = require('../utils/pin');

router.use(protect);

// Owners manage everyone except themselves. Managers manage cashiers only.
function canManage(actor, target) {
  if (actor.role === 'owner') return true;
  if (actor.role === 'manager') return target.role === 'cashier';
  return false;
}

async function findMember(req) {
  const target = await User.findOne({ _id: req.params.id, shopId: req.shop._id });
  if (!target) throw httpError(404, 'Member not found');
  return target;
}

router.get('/', async (req, res) => {
  const users = await User.find({ shopId: req.shop._id }).sort('createdAt');
  res.json(users.map((u) => u.toSafe()));
});

// Creates a member who has no email or smartphone. Returns a one-time PIN.
router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = normalizePhone(req.body.phone);
  const role = req.body.role || 'cashier';

  if (!name) throw httpError(400, 'Name is required');
  if (!isValidPhone(phone)) throw httpError(400, 'Enter a valid 10-digit mobile number');
  if (!['manager', 'cashier'].includes(role)) throw httpError(400, 'Role must be manager or cashier');
  if (req.user.role === 'manager' && role !== 'cashier') {
    throw httpError(403, 'Managers can only add cashiers');
  }
  if (await User.exists({ phone })) throw httpError(409, 'This mobile number is already registered');

  const pin = generatePin();
  const user = new User({ name, phone, role, shopId: req.shop._id, isActive: true });
  await user.setPin(pin, { requireChange: true });
  await user.save();
  res.status(201).json({ user: user.toSafe(), temporaryPin: pin });
});

// Changes role (owner only), or enables and disables access.
router.patch('/:id', async (req, res) => {
  const target = await findMember(req);
  const isSelf = target._id.equals(req.user._id);
  const { role, isActive } = req.body;

  if (isSelf && ((role !== undefined && role !== target.role) || isActive === false)) {
    throw httpError(400, "You can't change your own role or disable your own account");
  }
  if (!isSelf && !canManage(req.user, target)) throw httpError(403, 'You cannot change this member');

  if (role !== undefined && role !== target.role) {
    if (req.user.role !== 'owner') throw httpError(403, 'Only the owner can change roles');
    if (!['owner', 'manager', 'cashier'].includes(role)) throw httpError(400, 'Invalid role');
    target.role = role;
  }
  if (typeof isActive === 'boolean') {
    if (!canManage(req.user, target)) throw httpError(403, 'You cannot change this member');
    target.isActive = isActive;
  }

  await target.save();
  res.json({ user: target.toSafe() });
});

// Issues a new temporary PIN and unlocks the account.
router.post('/:id/reset-pin', async (req, res) => {
  const target = await findMember(req);
  if (target._id.equals(req.user._id)) {
    throw httpError(400, 'Use the Change PIN option to update your own PIN');
  }
  if (!canManage(req.user, target)) throw httpError(403, 'You cannot reset this member');

  const pin = generatePin();
  await target.setPin(pin, { requireChange: true });
  await target.save();
  res.json({ temporaryPin: pin });
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === String(req.user._id)) throw httpError(400, "You can't remove your own account");
  const target = await findMember(req);
  if (!canManage(req.user, target)) throw httpError(403, 'You cannot remove this member');
  await target.deleteOne();
  res.json({ message: 'Member removed' });
});

module.exports = router;