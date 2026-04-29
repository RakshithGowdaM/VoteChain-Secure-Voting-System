const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  candidateId: {
    type: String,
    required: true,
    index: true,
  },
  transactionHash: {
    type: String,
    default: null,
  },
  blockNumber: {
    type: Number,
    default: null,
  },
  gasUsed: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true,
  },
  network: {
    type: String,
    default: 'ethereum-mainnet',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: true });

// Compound index for common dashboard queries
voteSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Vote', voteSchema);
