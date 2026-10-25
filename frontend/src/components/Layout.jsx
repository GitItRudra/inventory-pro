import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, CreditCard, LayoutDashboard, LogOut, Package, ReceiptText, Settings, ShoppingCart, Tags, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/permissions';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/billing', label: 'Billing', icon: ShoppingCart },
  { to: '/sales', label: 'Sales', icon: ReceiptText },
  { to: '/stock', label: 'Stock ledger', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/users', label: 'Team', icon: Users, perm: 'team.view' },
  { to: '/settings', label: 'Settings', icon: Settings, perm: 'settings' },
  { to: '/subscription', label: 'Subscription', icon: CreditCard, perm: 'settings' },
];

const DAY = 86400000;

function planNotice(user) {
  const plan = user?.plan;
  if (!plan) return null;
  const isOwner = user.role === 'owner';

  if (!plan.hasAccess) {
    return {
      tone: 'danger',
      text: isOwner
        ? 'Your free trial or subscription has ended. The shop is read-only until you renew.'
        : 'This shop is read-only because its subscription has ended. Ask the owner to renew.',
    };
  }
  if (plan.status === 'past_due') {
    return {
      tone: 'warn',
      text: isOwner
        ? 'Your last subscription payment failed. Update your payment method before the grace period ends.'
        : 'The last subscription payment failed. Ask the owner to update the payment method.',
    };
  }
  if (plan.status === 'trialing' && plan.trialEndsAt) {
    const days = Math.ceil((new Date(plan.trialEndsAt) - Date.now()) / DAY);
    if (days <= 3) {
      return { tone: 'warn', text: `Your free trial ends in ${days} day${days === 1 ? '' : 's'}.` };
    }
  }
  return null;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNav = NAV.filter((item) => !item.perm || can(user?.role, item.perm));
  const notice = planNotice(user);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">IP</span>
          <div>
            <strong>Inventory Pro</strong>
            <small>{user?.shopName}</small>
          </div>
        </Link>

        <nav>
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{user?.name?.[0]?.toUpperCase()}</span>}
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email || user?.phone}</small>
              <small className="role-tag">{user?.role === 'owner' ? 'Owner' : user?.role}</small>
            </div>
          </div>
          <button className="btn ghost full" onClick={handleLogout}>
            <LogOut size={16} />
            Sign out
          </button>
          <div className="legal-links">
            <Link to="/about">About</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </aside>

      <main className="content">
        {notice && (
          <div className={`plan-banner ${notice.tone}`}>
            {notice.text}
            {user?.role === 'owner' && <Link to="/subscription">Manage subscription</Link>}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}