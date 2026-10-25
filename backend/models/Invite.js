const mongoose = require('mongoose');
const { Schema } = mongoose;

const inviteSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['owner', 'manager', 'cashier'], default: 'cashier' },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invite', inviteSchema);