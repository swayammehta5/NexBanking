require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression  = require('compression');
const morgan       = require('morgan');
const fs           = require('fs');

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');

if (!fs.existsSync('logs')) fs.mkdirSync('logs');
const app = express();
connectDB();

app.use(helmet());
app.use(mongoSanitize());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Routes ───────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ success: true, message: 'NexBanking API running' }));

app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/account',       require('./routes/accountRoutes'));
app.use('/api/transactions',  require('./routes/transactionRoutes'));
app.use('/api/beneficiaries', require('./routes/beneficiaryRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/statement',     require('./routes/statementRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));
app.use('/api/ai',            require('./routes/aiRoutes'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 NexBanking API running on http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
