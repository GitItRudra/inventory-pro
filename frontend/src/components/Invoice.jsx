import { Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { inr, dateTime } from '../utils/format';

function Row({ label, value, strong }) {
  return (
    <div className={`total-row ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function Invoice({ sale }) {
  const { user } = useAuth();
  return (
    <div>
      <div className="invoice print-area">
        <header className="invoice-head">
          <div>
            <h2>{user?.shopName || 'Tax Invoice'}</h2>
            <small className="muted">Tax Invoice</small>
          </div>
          <div className="right">
            <strong className="mono">{sale.invoiceNo}</strong>
            <small className="muted block">{dateTime(sale.createdAt)}</small>
          </div>
        </header>

        <div className="invoice-meta">
          <div>
            <small className="muted block">Billed to</small>
            <strong>{sale.customerName}</strong>
            {sale.customerPhone && <small className="muted block">{sale.customerPhone}</small>}
          </div>
          <div className="right">
            <small className="muted block">Payment</small>
            <strong className="upper">{sale.paymentMode}</strong>
          </div>
        </div>

        <table className="table invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">GST</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={i}>
                <td>
                  <strong>{it.name}</strong>
                  <small className="mono">{it.sku}</small>
                </td>
                <td className="num">{it.quantity}</td>
                <td className="num">{inr(it.unitPrice)}</td>
                <td className="num">{it.gstRate}%</td>
                <td className="num">{inr(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <Row label="Subtotal (incl. GST)" value={inr(sale.subtotal)} />
          <Row label="of which GST" value={inr(sale.taxTotal)} />
          {sale.discount > 0 && <Row label="Discount" value={`- ${inr(sale.discount)}`} />}
          <Row label="Grand total" value={inr(sale.grandTotal)} strong />
        </div>

        <p className="invoice-foot">
          Prices are inclusive of GST. Please keep this invoice for warranty and returns. Thank you for shopping with us.
        </p>
      </div>

      <div className="modal-actions no-print">
        <button className="btn primary" onClick={() => window.print()}>
          <Printer size={16} />
          Print invoice
        </button>
      </div>
    </div>
  );
}
