const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  phoneDigest: {
    type: String,
    unique: true,
    index: true,
    sparse: true,
  },
  phoneHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  hasVoted: {
    type: Boolean,
    default: false,
  },
  votedAt: Date,
  tokenHash: String, // hashed version of the token used
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Never store raw phone numbers — only hashed
userSchema.statics.normalizePhone = function(phone) {
  return String(phone || '').replace(/[^\d+]/g, '').trim();
};

userSchema.statics.createPhoneDigest = function(phone) {
  const normalized = this.normalizePhone(phone);
  const secret = process.env.PHONE_HASH_SECRET || process.env.JWT_SECRET || 'dev-secret';
  return crypto.createHash('sha256').update(`${normalized}|${secret}`).digest('hex');
};

userSchema.statics.hashPhone = async function(phone) {
  const normalized = this.normalizePhone(phone);
  return await bcrypt.hash(normalized, 12);
};

userSchema.statics.findByPhone = async function(phone) {
  const normalized = this.normalizePhone(phone);
  const all = await this.find({});
  for (const user of all) {
    if (await bcrypt.compare(phone, user.phoneHash)) return user;
    if (normalized !== phone && await bcrypt.compare(normalized, user.phoneHash)) return user;
  }
  return null;
};

module.exports = mongoose.model('User', userSchema);
