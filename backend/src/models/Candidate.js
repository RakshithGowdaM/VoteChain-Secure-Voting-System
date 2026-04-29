const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  manifesto: { type: String, default: '' },
  color: { type: String, default: '#3b82f6' },
  initials: { type: String, required: true },
  isActive: { type: Boolean, default: true, index: true },
  voteCount: { type: Number, default: 0 }, // cached count
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);
