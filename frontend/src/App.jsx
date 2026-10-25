import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { can } from './utils/permissions';
import Layout from './components/Layout';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import SetPin from './pages/SetPin';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Sales from './pages/Sales';
import StockLedger from './pages/StockLedger';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import About from './pages/About';
import Terms from './pages/Terms';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash">Loading Inventory Pro...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustSetPin) return <SetPin />;
  return children;
}

function RequirePerm({ perm, children }) {
  const { user } = useAuth();
  return can(user?.role, perm) ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />
      <Route path="/about" element={<About />} />
      <Route path="/terms" element={<Terms />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="billing" element={<Billing />} />
        <Route path="sales" element={<Sales />} />
        <Route path="stock" element={<StockLedger />} />
        <Route path="categories" element={<Categories />} />
        <Route path="users" element={<RequirePerm perm="team.view"><Users /></RequirePerm>} />
        <Route path="settings" element={<RequirePerm perm="settings"><Settings /></RequirePerm>} />
        <Route path="subscription" element={<RequirePerm perm="settings"><Subscription /></RequirePerm>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}