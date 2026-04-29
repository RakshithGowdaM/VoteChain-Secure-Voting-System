'use strict';
const router = require('express').Router();
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');

// GET /api/results
router.get('/', async (req, res) => {
  try {
    const election = await Election.findOne().lean();
    if (!election || !['closed', 'published'].includes(election.status)) {
      return res.status(403).json({ message: 'Results are not available yet.' });
    }
    const candidates = await Candidate.find({}, 'name party votes').lean();
    res.json(candidates);
  } catch {
    res.status(500).json({ message: 'Failed to fetch results.' });
  }
});

module.exports = router;
