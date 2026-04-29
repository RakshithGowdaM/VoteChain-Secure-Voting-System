'use strict';

const otpStore = new Map(); // phone → { code, expiresAt }

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function storeOtp(phone, code) {
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
}

function verifyOtp(phone, code) {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { otpStore.delete(phone); return false; }
  if (entry.code !== code) return false;
  otpStore.delete(phone);
  return true;
}

async function sendOtp(phone, code) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (sid && token && from) {
    const twilio = require('twilio')(sid, token);
    await twilio.messages.create({
      body: `Your VoteChain OTP is: ${code}. Valid for 5 minutes.`,
      from,
      to: phone,
    });
  } else {
    // Development fallback: log the OTP
    console.log(`[DEV] OTP for ${phone}: ${code}`);
  }
}

module.exports = { generateOtp, storeOtp, verifyOtp, sendOtp };
