// Mirrors backend/utils/permissions.js. Used only to show or hide menu items.
// The server is the real check.
export const ROLE_PERMS = {
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

export const can = (role, perm) => (ROLE_PERMS[role] || []).includes(perm);