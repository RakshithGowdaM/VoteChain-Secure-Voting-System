const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const ResultSettings = require('../models/ResultSettings');

const getResultSettings = async () => {
  let settings = await ResultSettings.findOne({ key: 'global' });
  if (!settings) {
    settings = await ResultSettings.create({ key: 'global', publishAt: null });
  }
  return settings;
};

// GET /api/candidates — public
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find({ isActive: true }).select('-__v');
    res.json({ success: true, data: candidates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch candidates' });
  }
});

// GET /api/candidates/results — public vote counts
router.get('/results', async (req, res) => {
  try {
    const settings = await getResultSettings();
    const now = new Date();

    if (!settings.publishAt || now < settings.publishAt) {
      return res.json({
        success: true,
        isPublished: false,
        publishAt: settings.publishAt,
        data: [],
        totalVotes: 0,
        message: settings.publishAt
          ? 'Results will be published at the scheduled time.'
          : 'Results are not scheduled yet.',
      });
    }

    const candidates = await Candidate.find({ isActive: true }).select('candidateId name party color initials voteCount');
    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
    const results = candidates.map(c => ({
      ...c.toObject(),
      percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : '0.0',
    }));
    res.json({
      success: true,
      isPublished: true,
      publishAt: settings.publishAt,
      data: results,
      totalVotes,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
});

module.exports = router;
