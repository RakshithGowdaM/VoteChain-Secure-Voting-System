'use strict';
const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'open', 'closed', 'published'],
      default: 'pending',
    },
    name: {
      type: String,
      default: process.env.ELECTION_NAME || 'General Election',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Election', electionSchema);
