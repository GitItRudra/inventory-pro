const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

const userSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    password: { type: String, select: false },
    pinHash: { type: String, select: false },
    pinSetAt: Date,
    mustSetPin: { type: Boolean, default: false },
    failedPinAttempts: { type: Number, default: 0, select: false },
    pinLockedUntil: { type: Date, select: false },
    googleId: { type: String, index: true, sparse: true },
    avatar: String,
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true },
    role: { type: String, enum: ['owner', 'manager', 'cashier'], default: 'cashier' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.setPin = async function setPin(pin, { requireChange = false } = {}) {
  this.pinHash = await bcrypt.hash(pin, 10);
  this.pinSetAt = new Date();
  this.mustSetPin = requireChange;
  this.failedPinAttempts = 0;
  this.pinLockedUntil = undefined;
};

userSchema.methods.isPinLocked = function isPinLocked() {
  return Boolean(this.pinLockedUntil && this.pinLockedUntil > new Date());
};

// Needs the pinHash, failedPinAttempts and pinLockedUntil fields selected.
userSchema.methods.checkPin = async function checkPin(pin) {
  if (!this.pinHash) return false;
  const ok = await bcrypt.compare(String(pin), this.pinHash);
  if (ok) {
    this.failedPinAttempts = 0;
    this.pinLockedUntil = undefined;
  } else {
    this.failedPinAttempts += 1;
    if (this.failedPinAttempts >= PIN_MAX_ATTEMPTS) {
      this.pinLockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60000);
      this.failedPinAttempts = 0;
    }
  }
  await this.save();
  return ok;
};

userSchema.methods.toSafe = function toSafe() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.pinHash;
  delete obj.failedPinAttempts;
  delete obj.pinLockedUntil;
  return obj;
};

module.exports = mongoose.model('User', userSchema);