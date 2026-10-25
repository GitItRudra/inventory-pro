const crypto = require('crypto');

exports.generatePin = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');