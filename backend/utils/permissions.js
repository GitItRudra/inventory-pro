const ROLE_PERMS = {
  owner: [
    'billing', 'cost.view', 'products.manage', 'products.delete',
    'categories.manage', 'categories.delete', 'stock.in', 'stock.adjust',
    'sales.cancelPaid', 'discount.unlimited', 'team.view', 'team.manage', 'settings',
  ],
  manager: [
    'billing', 'cost.view', 'products.manage', 'categories.manage',
    'stock.in', 'stock.adjust', 'sales.cancelPaid', 'discount.unlimited',
    'team.view', 'team.manage',
  ],
  cashier: ['billing', 'stock.in'],
};

const can = (role, perm) => (ROLE_PERMS[role] || []).includes(perm);

module.exports = { ROLE_PERMS, can };