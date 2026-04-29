const mongoose = require('mongoose');

const resultSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global',
  },
  publishAt: {
    type: Date,
    default: null,
  },
  electionStartAt: {
    type: Date,
    default: null,
  },
  electionEndAt: {
    type: Date,
    default: null,
  },
  votingLocked: {
    type: Boolean,
    default: false,
  },
  electionEnded: {
    type: Boolean,
    default: false,
  },
  electionEndedAt: {
    type: Date,
    default: null,
  },
  updatedBy: {
    type: String,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('ResultSettings', resultSettingsSchema);
