const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 150 },
    sku: { type: String, required: [true, 'SKU is required'], uppercase: true, trim: true },
    barcode: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, trim: true, maxlength: 500 },
    hsnCode: { type: String, trim: true, maxlength: 10 },
    unit: { type: String, default: 'pcs', trim: true },
    costPrice: { type: Number, default: 0, min: [0, 'Cost price cannot be negative'] },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    gstRate: {
      type: Number,
      enum: { values: [0, 5, 12, 18, 28], message: 'GST rate must be 0, 5, 12, 18 or 28' },
      default: 18,
    },
    quantity: { type: Number, default: 0, min: [0, 'Stock cannot be negative'] },
    reorderLevel: { type: Number, default: 5, min: 0 },
    location: { type: String, trim: true, maxlength: 60 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.quantity === 0) return 'out';
  if (this.quantity <= this.reorderLevel) return 'low';
  return 'ok';
});

// SKU is unique within a shop, not across the whole platform.
productSchema.index({ shopId: 1, sku: 1 }, { unique: true });
productSchema.index({ shopId: 1, name: 1 });
productSchema.index({ shopId: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);