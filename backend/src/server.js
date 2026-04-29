require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./config/logger');
const app = require('./app');

const validateStartupEnv = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret' || process.env.JWT_SECRET === 'change-me-in-production') {
    logger.warn('⚠️  JWT_SECRET is missing or weak. Set a strong secret before production deployment.');
  }

  if (!process.env.MONGO_URI) {
    logger.warn('⚠️  MONGO_URI not set. Falling back to localhost MongoDB.');
  }

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    logger.warn('⚠️  Admin credentials are not fully configured in env variables.');
  }
};

validateStartupEnv();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/votechain')
  .then(() => logger.info('✅ MongoDB connected'))
  .catch((err) => {
    logger.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 VoteChain API running on port ${PORT}`);
  logger.info(`📋 Environment: ${process.env.NODE_ENV}`);
});
