const mongoose = require('mongoose');
const { Schema } = mongoose;

const saleItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    sku: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: Number,
    gstRate: Number,
    taxableValue: Number,
    taxAmount: Number,
    lineTotal: Number,
  },
  { _id: false }
);

const saleSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    invoiceNo: { type: String, required: true },
    customerName: { type: String, trim: true, default: 'Walk-in Customer' },
    customerPhone: { type: String, trim: true },
    items: { type: [saleItemSchema], validate: [(v) => v.length > 0, 'A bill needs at least one item'] },
    subtotal: Number,
    taxTotal: Number,
    discount: { type: Number, default: 0 },
    grandTotal: Number,
    paymentMode: { type: String, enum: ['cash', 'upi', 'card', 'credit', 'online'], default: 'cash' },
    paymentStatus: { type: String, enum: ['paid', 'pending', 'failed'], default: 'paid' },
    status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
    cancelReason: { type: String, trim: true, maxlength: 200 },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: String,
    paidAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Invoice numbers are unique within a shop, so two shops can both issue INV-...-0001.
saleSchema.index({ shopId: 1, invoiceNo: 1 }, { unique: true });
saleSchema.index({ shopId: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);