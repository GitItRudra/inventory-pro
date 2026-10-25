const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockMovementSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: ['in', 'out', 'adjust', 'sale'], required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 200 },
    reference: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockMovementSchema.index({ shopId: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);