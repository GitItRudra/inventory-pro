const { protect } = require('./auth');
const { can } = require('../utils/permissions');
const httpError = require('../utils/httpError');

// Usage: guard({ GET: 'billing', POST: 'products.manage' })
// A rule can also be a function (req) => permission, for rules that depend on the request.
module.exports = function guard(rules) {
  return [
    protect,
    (req, res, next) => {
      const rule = rules[req.method];
      if (!rule) return next();
      const perm = typeof rule === 'function' ? rule(req) : rule;
      if (!perm || can(req.user.role, perm)) return next();
      next(httpError(403, 'Your role does not allow this action'));
    },
  ];
};