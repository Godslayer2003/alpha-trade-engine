const { randomBytes } = require('crypto');

process.env.JWT_SECRET ||= randomBytes(32).toString('hex');
