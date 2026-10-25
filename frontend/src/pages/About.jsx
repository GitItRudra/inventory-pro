import { Link } from 'react-router-dom';
import PublicShell from '../components/PublicShell';

const FEATURES = [
  ['Live stock control', 'Every sale, purchase and correction updates stock immediately, with a record of who changed what and why.'],
  ['Fast billing', 'Search by name or SKU, build the bill, apply a discount and print a GST-inclusive invoice in a few taps.'],
  ['Reorder alerts', 'Set a reorder level for each product. The dashboard flags low and out-of-stock items before they cost you a sale.'],
  ['GST-ready pricing', 'Assign GST slabs of 0, 5, 12, 18 or 28 percent per product, with HSN codes. Every invoice shows the tax component.'],
  ['Reports at a glance', 'See today’s revenue, the last seven days, top sellers and the value of the stock you hold at cost.'],
  ['Secure sign-in', 'Sign in with email and password or with your Google account. Sessions use signed tokens with an expiry.'],
];

export default function About() {
  return (
    <PublicShell>
      <section className="hero">
        <p className="eyebrow">About Inventory Pro</p>
        <h1>Inventory management built for the shops that run India.</h1>
        <p className="lead">
          Inventory Pro helps kirana stores, pharmacies, stationery shops and small retailers know what they have, what they
          have sold and what to order next, without a complicated system or a long training session.
        </p>
        <div className="hero-cta">
          <Link to="/login" className="btn primary">Get started</Link>
          <Link to="/terms" className="btn">Read the terms</Link>
        </div>
      </section>

      <h2>What you get</h2>
      <div className="feature-grid">
        {FEATURES.map(([title, body]) => (
          <div key={title} className="feature">
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>

      <h2>How it works</h2>
      <ol className="steps">
        <li><strong>Add your products.</strong> Enter the name, SKU, selling price, GST rate and opening stock. You can export the full list to CSV at any time.</li>
        <li><strong>Bill your customers.</strong> Each sale reduces stock automatically and creates a numbered invoice.</li>
        <li><strong>Watch the dashboard.</strong> Know when to reorder, which products sell best and how the week is going.</li>
      </ol>

      <h2>Built with</h2>
      <p>
        MongoDB Atlas for storage, Express and Node.js for the API, React for the interface, JSON Web Tokens for session
        security, and Google Identity Services for optional Google sign-in.
      </p>

      <h2>Who it is for</h2>
      <p>
        Owners who run one or a few shops and want accurate stock without buying expensive software. Staff accounts and
        multi-branch support are planned for future releases.
      </p>

      <h2>Contact</h2>
      <p>
        For support, feature requests or business enquiries, write to <strong>support@your-domain.example</strong>. Replace
        this with your own address before going live.
      </p>
    </PublicShell>
  );
}
