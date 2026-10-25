const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');
const httpError = require('../utils/httpError');

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Writes that stay allowed after a trial or subscription ends:
// signing in, renewing, Razorpay keys, and online payments for bills already created.
const ALWAYS_WRITABLE = ['/api/auth', '/api/subscription', '/api/payments', '/api/shop/payments'];

// Users who must set a new PIN can only reach these endpoints.
const PIN_RESET_ALLOWED = ['/api/auth/set-pin', '/api/auth/me'];

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Not signed in'));

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(httpError(401, 'Your session has expired. Please sign in again.'));
  }

  let user;
  let shop;
  try {
    user = await User.findById(payload.id);
    shop = user && (await Shop.findById(user.shopId));
  } catch (err) {
    return next(err);
  }

  if (!user) return next(httpError(401, 'Account no longer exists'));
  if (!user.isActive) return next(httpError(403, 'Your access has been disabled. Ask your shop owner.'));
  if (!shop) return next(httpError(403, 'This account is not linked to a shop'));
  if (user.mustSetPin && !PIN_RESET_ALLOWED.some((p) => req.originalUrl.startsWith(p))) {
    return next(httpError(403, 'Please set your new PIN to continue.'));
  }

  // Read-only mode: after the trial or subscription ends, reads still work but changes don't.
  const isWrite = WRITE_METHODS.includes(req.method);
  const isAllowedWrite = ALWAYS_WRITABLE.some((p) => req.originalUrl.startsWith(p));
  if (isWrite && !isAllowedWrite && !shop.hasAccess()) {
    return next(httpError(402, 'Your free trial or subscription has ended. Renew to make changes.'));
  }

  req.user = user;
  req.shop = shop;
  next();
}

function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') return next(httpError(403, 'Only the shop owner can do this'));
  next();
}

// Kept for compatibility. protect() now enforces read-only mode on every write.
function requireAccess(req, res, next) {
  next();
}

module.exports = { protect, requireOwner, requireAccess, signToken };