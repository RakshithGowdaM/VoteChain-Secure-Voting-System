'use strict';
const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const Candidate = require('../models/Candidate');
const Voter = require('../models/Voter');
const Election = require('../models/Election');

// POST /api/vote
router.post('/', requireAuth, async (req, res) => {
  const { candidateId } = req.body;
  const phone = req.user?.phone;

  if (!phone) return res.status(403).json({ message: 'Voter identity not found in token.' });
  if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
    return res.status(400).json({ message: 'A valid candidate ID is required.' });
  }

  try {
    // Check election is open
    const election = await Election.findOne().lean();
    if (!election || election.status !== 'open') {
      return res.status(400).json({ message: 'Election is not currently open.' });
    }

    // Check candidate exists
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found.' });

    // Check voter hasn't already voted (use phone hash to preserve privacy)
    const phoneHash = Buffer.from(phone + (process.env.PHONE_HASH_SECRET || '')).toString('base64');
    const existing = await Voter.findOne({ phoneHash });
    if (existing?.hasVoted) {
      return res.status(409).json({ message: 'You have already voted.' });
    }

    // Record vote
    candidate.votes += 1;
    await candidate.save();

    // Mark voter as having voted
    await Voter.findOneAndUpdate(
      { phoneHash },
      { phoneHash, hasVoted: true },
      { upsert: true }
    );

    res.json({ message: 'Vote cast successfully.', txHash: null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cast vote.' });
  }
});

module.exports = router;
