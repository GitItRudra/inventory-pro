const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: [true, 'Category name is required'], trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

categorySchema.index({ shopId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);