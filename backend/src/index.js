'use strict';
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const logger = require('./utils/logger');

const authRouter = require('./routes/auth');
const candidatesRouter = require('./routes/candidates');
const voteRouter = require('./routes/vote');
const resultsRouter = require('./routes/results');
const adminRouter = require('./routes/admin');
const electionRouter = require('./routes/election');

const app = express();

// ── Security middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);

// ── Body parser ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/vote', voteRouter);
app.use('/api/results', resultsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/election', electionRouter);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'votechain-backend',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// ── Error handler ─────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/votechain';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info(`MongoDB connected: ${MONGO_URI.replace(/:\/\/[^@]+@/, '://***@')}`);
    app.listen(PORT, () => logger.info(`Backend listening on port ${PORT}`));
  })
  .catch((err) => {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  });

module.exports = app;
