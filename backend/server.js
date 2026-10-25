require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');
const guard = require('./middleware/access');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));

// Razorpay webhooks are verified against the exact raw bytes of the body,
// so these routes must be parsed as raw before the JSON parser runs.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.body ??= {};
  next();
});
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use(
  '/api/auth',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false })
);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/join', require('./routes/join'));
app.use('/api/shop/payments', require('./routes/shopPayments'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/invites', require('./routes/invites'));
app.use('/api/subscription', require('./routes/subscription'));

// Role checks happen here, before each router runs. See utils/permissions.js for the matrix.
app.use(
  '/api/users',
  guard({ GET: 'team.view', POST: 'team.manage', PATCH: 'team.manage', DELETE: 'team.manage' }),
  require('./routes/users')
);
app.use(
  '/api/products',
  guard({ GET: 'billing', POST: 'products.manage', PUT: 'products.manage', DELETE: 'products.delete' }),
  require('./routes/products')
);
app.use(
  '/api/categories',
  guard({ GET: 'billing', POST: 'categories.manage', DELETE: 'categories.delete' }),
  require('./routes/categories')
);
app.use(
  '/api/stock',
  guard({
    GET: 'billing',
    POST: (req) => (req.body?.type === 'in' ? 'stock.in' : 'stock.adjust'),
  }),
  require('./routes/stock')
);
app.use('/api/sales', guard({ GET: 'billing', POST: 'billing' }), require('./routes/sales'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dashboard', guard({ GET: 'billing' }), require('./routes/dashboard'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)))
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });