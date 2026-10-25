const mongoose = require('mongoose');
const { Schema } = mongoose;

const planSchema = new Schema(
  {
    status: { type: String, enum: ['trialing', 'active', 'past_due', 'cancelled'], default: 'trialing' },
    trialEndsAt: Date,
    currentPeriodEnd: Date,
    graceUntil: Date,
    razorpaySubscriptionId: String,
  },
  { _id: false }
);

// Encrypted secrets are excluded from queries unless explicitly selected.
const paymentsSchema = new Schema(
  {
    keyId: String,
    keySecretEnc: { type: String, select: false },
    webhookSecretEnc: { type: String, select: false },
    configuredAt: Date,
  },
  { _id: false }
);

const shopSchema = new Schema(
  {
    name: { type: String, required: [true, 'Shop name is required'], trim: true, maxlength: 120 },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^$|^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GSTIN or leave it blank'],
    },
    address: { type: String, trim: true, maxlength: 300 },
    phone: { type: String, trim: true, maxlength: 20 },
    plan: { type: planSchema, default: () => ({}) },
    payments: { type: paymentsSchema },
    settings: {
      cashierMaxDiscountPct: { type: Number, default: 5, min: 0, max: 100 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

shopSchema.methods.hasAccess = function hasAccess(now = new Date()) {
  const { status, trialEndsAt, currentPeriodEnd, graceUntil } = this.plan;
  if (status === 'active') return !currentPeriodEnd || currentPeriodEnd > now;
  if (status === 'trialing') return Boolean(trialEndsAt && trialEndsAt > now);
  // A failed renewal keeps full access for the grace period, then becomes read-only.
  if (status === 'past_due') return Boolean(graceUntil && graceUntil > now);
  return false;
};

shopSchema.methods.planInfo = function planInfo() {
  return {
    status: this.plan.status,
    trialEndsAt: this.plan.trialEndsAt,
    currentPeriodEnd: this.plan.currentPeriodEnd,
    graceUntil: this.plan.graceUntil,
    hasAccess: this.hasAccess(),
  };
};

module.exports = mongoose.model('Shop', shopSchema);