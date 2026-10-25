const crypto = require('crypto');

exports.newToken = () => crypto.randomBytes(32).toString('hex');
exports.hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');