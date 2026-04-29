'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const voterSchema = new mongoose.Schema(
  {
    phoneHash: { type: String, required: true, unique: true },
    hasVoted:  { type: Boolean, default: false },
    voteToken: { type: String },
  },
  { timestamps: true }
);

voterSchema.statics.hashPhone = function (phone) {
  const secret = process.env.PHONE_HASH_SECRET || 'default_secret';
  return bcrypt.hashSync(phone + secret, 10);
};

module.exports = mongoose.model('Voter', voterSchema);
