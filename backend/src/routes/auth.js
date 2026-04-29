const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();

const User = require('../models/User');
const OTPModel = require('../models/OTP');
const { generateOTP, sendOTP, hashOTP, verifyOTP } = require('../services/otpService');
const { generateVotingToken, hashToken } = require('../services/blockchainService');
const { getVotingGateStatus } = require('../services/electionService');
const logger = require('../config/logger');

const normalizePhone = (phone) => String(phone || '').replace(/[^\d+]/g, '').trim();
const createPhoneDigest = (phone) => {
  const secret = process.env.PHONE_HASH_SECRET || process.env.JWT_SECRET || 'dev-secret';
  return crypto.createHash('sha256').update(`${normalizePhone(phone)}|${secret}`).digest('hex');
};

// Strict OTP rate limiting
const otpLimiter = rateLimit({
  windowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX) || 5,
  keyGenerator: (req) => req.body.phone || req.ip,
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes.' },
});

// POST /api/auth/send-otp
router.post('/send-otp', otpLimiter, [
  body('phone')
    .isMobilePhone()
    .withMessage('Valid phone number required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { phone } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const phoneDigest = createPhoneDigest(normalizedPhone);
    const phoneHash = await bcrypt.hash(normalizedPhone, 12);

    const gate = await getVotingGateStatus();
    if (!gate.allowed) {
      return res.status(403).json({
        success: false,
        message: gate.message,
      });
    }

    // Check if already voted
    let existingUser = await User.findOne({ phoneDigest });
    if (!existingUser) {
      existingUser = await User.findByPhone(normalizedPhone);
      if (existingUser && !existingUser.phoneDigest) {
        existingUser.phoneDigest = phoneDigest;
        await existingUser.save();
      }
    }

    if (existingUser?.hasVoted) {
      return res.status(403).json({
        success: false,
        message: 'This phone number has already cast a vote.',
      });
    }

    // Create or update user record with phone hash
    if (!existingUser) {
      await User.create({
        phoneDigest,
        phoneHash,
        hasVoted: false,
      });
    }

    // Invalidate old OTPs
    await OTPModel.deleteMany({ phoneDigest });

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    await OTPModel.create({
      phoneDigest,
      otp: otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const delivery = await sendOTP(phone, otp);

    // Store a temporary session identifier (phone hash) so we can match OTP later
    const sessionToken = jwt.sign(
      { phoneDigest, step: 'otp-sent' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '15m' }
    );

    const responsePayload = {
      success: true,
      message: 'OTP sent successfully',
      sessionToken, // Frontend stores this temporarily
      deliveryMode: delivery?.deliveryMode || 'unknown',
    };

    if (process.env.NODE_ENV !== 'production' && delivery?.devOtp) {
      responsePayload.devOtp = delivery.devOtp;
    }

    res.json(responsePayload);
  } catch (err) {
    logger.error(`Send OTP error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', [
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP required'),
  body('sessionToken').notEmpty().withMessage('Session token required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { otp, sessionToken } = req.body;

    // Verify session token
    let decoded;
    try {
      decoded = jwt.verify(sessionToken, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      return res.status(401).json({ success: false, message: 'Session expired. Please request a new OTP.' });
    }

    if (decoded.step !== 'otp-sent') {
      return res.status(400).json({ success: false, message: 'Invalid session state' });
    }

    if (!decoded.phoneDigest) {
      return res.status(400).json({ success: false, message: 'Invalid session token payload' });
    }

    // Find latest OTP record for this phone only
    const otpRecord = await OTPModel.findOne({
      phoneDigest: decoded.phoneDigest,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP session' });
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      await OTPModel.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ success: false, message: 'Max attempts reached. Request a new OTP.' });
    }

    const isOtpValid = await verifyOTP(otp, otpRecord.otp);
    otpRecord.attempts += 1;

    if (!isOtpValid) {
      if (otpRecord.attempts >= 5) {
        await OTPModel.deleteOne({ _id: otpRecord._id });
      } else {
        await otpRecord.save();
      }
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const user = await User.findOne({ phoneDigest: decoded.phoneDigest });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Session is no longer valid. Request OTP again.' });
    }

    if (user.hasVoted) {
      return res.status(403).json({
        success: false,
        message: 'This phone number has already cast a vote.',
      });
    }

    // Generate anonymous voting token
    const votingToken = generateVotingToken();
    const tokenHash = hashToken(votingToken);

    // Update user record with token hash (link phone to voting token)
    user.tokenHash = tokenHash;
    await user.save();

    // Issue JWT with voting token embedded
    const authToken = jwt.sign(
      { tokenHash, step: 'verified', role: 'voter' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      authToken,
      votingToken, // Sent to frontend for display; backend uses tokenHash
    });
  } catch (err) {
    logger.error('Verify OTP error:', err.message);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

module.exports = router;
