'use strict';
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateOtp, storeOtp, verifyOtp: checkOtp, sendOtp } = require('../utils/otp');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

// POST /api/auth/request-otp
router.post('/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

  const code = generateOtp();
  storeOtp(phone, code);
  try {
    await sendOtp(phone, code);
    res.json({ message: 'OTP sent successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required.' });

  if (!checkOtp(phone, otp)) {
    return res.status(401).json({ message: 'Invalid or expired OTP.' });
  }

  const token = jwt.sign({ phone, role: 'voter' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token });
});

// POST /api/auth/admin-login
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'votechain2025';

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token });
});

module.exports = router;
