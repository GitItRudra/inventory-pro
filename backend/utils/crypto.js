const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function key() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters in backend/.env');
  }
  return Buffer.from(hex, 'hex');
}

// Output format: iv.tag.ciphertext (all base64). Each value gets a fresh random IV.
exports.encrypt = (text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
};

exports.decrypt = (payload) => {
  const [iv, tag, data] = String(payload).split('.').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};