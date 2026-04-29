const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

let twilioClient = null;

const isPlaceholder = (value = '') => {
  const v = String(value).trim().toLowerCase();
  if (!v) return true;
  return v.includes('xxxxxxxx') || v.includes('your_');
};

const initTwilio = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!isPlaceholder(sid) && !isPlaceholder(token) && !isPlaceholder(from)) {
    const twilio = require('twilio');
    twilioClient = twilio(sid, token);
    logger.info('✅ Twilio initialized');
  } else {
    logger.warn('⚠️  Twilio not configured — OTPs will be logged to console (dev mode)');
  }
};

initTwilio();

const generateOTP = () => {
  // Cryptographically secure 6-digit OTP
  const buf = crypto.randomBytes(3);
  const num = (buf.readUIntBE(0, 3) % 900000) + 100000;
  return num.toString();
};

const sendOTP = async (phone, otp) => {
  if (twilioClient) {
    try {
      await twilioClient.messages.create({
        body: `Your VoteChain verification code is: ${otp}. Valid for 10 minutes. Do NOT share this with anyone.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      logger.info(`OTP sent to ${phone.slice(0, 5)}XXXXX`);
      return { deliveryMode: 'sms' };
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      logger.warn(`Twilio send failed in dev mode. Falling back to console OTP: ${err.message}`);
    }
  } else {
    logger.warn('[DEV MODE] Twilio disabled. OTP will be logged to console.');
  }

  // Development mode fallback
  logger.warn(`[DEV MODE] OTP for ${phone}: ${otp}`);
  console.log(`\n🔑 DEV OTP for ${phone}: ${otp}\n`);
  return { deliveryMode: 'dev-log', devOtp: otp };
};

const hashOTP = async (otp) => bcrypt.hash(otp, 10);
const verifyOTP = async (otp, hash) => bcrypt.compare(otp, hash);

module.exports = { generateOTP, sendOTP, hashOTP, verifyOTP };
