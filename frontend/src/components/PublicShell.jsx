import { Link } from 'react-router-dom';

export default function PublicShell({ children }) {
  return (
    <div className="public-page">
      <header className="public-head">
        <Link to="/" className="brand">
          <span className="brand-mark">IP</span>
          <strong>Inventory Pro</strong>
        </Link>
        <nav>
          <Link to="/about">About</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/login" className="btn primary small">Sign in</Link>
        </nav>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-foot">
        Copyright {new Date().getFullYear()} Inventory Pro. Built for small shops across India.
      </footer>
    </div>
  );
}
