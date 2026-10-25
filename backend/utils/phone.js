exports.normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(-10);
exports.isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);