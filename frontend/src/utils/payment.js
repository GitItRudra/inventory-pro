import api, { getErrorMessage } from '../api';

// Opens the Razorpay popup for an unpaid sale.
// onPaid receives the updated sale once the server has verified the payment.
export async function openRazorpay(sale, { shopName, onPaid, onError }) {
  const { data: order } = await api.post('/payments/order', { saleId: sale._id });

  if (!window.Razorpay) {
    throw new Error('The payment window did not load. Check your internet connection and refresh the page.');
  }

  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: shopName || 'Inventory Pro',
    description: `Invoice ${order.invoiceNo}`,
    prefill: { name: order.customerName, contact: order.customerPhone || undefined },
    theme: { color: '#B4532A' },
    handler: async (response) => {
      try {
        const { data: paid } = await api.post('/payments/verify', {
          saleId: sale._id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        onPaid(paid);
      } catch (err) {
        onError(getErrorMessage(err));
      }
    },
    modal: {
      ondismiss: () => onError('Payment window closed. The bill stays pending until it is paid or cancelled.'),
    },
  });

  rzp.on('payment.failed', (r) =>
    onError(r?.error?.description || 'Payment failed. You can retry or cancel this bill.')
  );
  rzp.open();
}