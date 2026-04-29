'use strict';
const router = require('express').Router();
const Candidate = require('../models/Candidate');

// GET /api/candidates
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find({}, '-votes').lean();
    res.json(candidates);
  } catch {
    res.status(500).json({ message: 'Failed to fetch candidates.' });
  }
});

module.exports = router;
