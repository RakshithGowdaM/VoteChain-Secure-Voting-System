'use strict';
const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');

async function getOrCreateElection() {
  let election = await Election.findOne();
  if (!election) election = await Election.create({});
  return election;
}

// POST /api/admin/candidates  — add candidate
router.post('/candidates', requireAdmin, async (req, res) => {
  const { name, party } = req.body;
  if (!name || !party) return res.status(400).json({ message: 'Name and party are required.' });
  try {
    const candidate = await Candidate.create({ name, party });
    res.status(201).json(candidate);
  } catch {
    res.status(500).json({ message: 'Failed to add candidate.' });
  }
});

// DELETE /api/admin/candidates/:id  — remove candidate
router.delete('/candidates/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Candidate.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Candidate not found.' });
    res.json({ message: 'Candidate removed.' });
  } catch {
    res.status(500).json({ message: 'Failed to delete candidate.' });
  }
});

// POST /api/admin/election/open
router.post('/election/open', requireAdmin, async (req, res) => {
  try {
    const election = await getOrCreateElection();
    election.status = 'open';
    await election.save();
    res.json({ status: election.status });
  } catch {
    res.status(500).json({ message: 'Failed to open election.' });
  }
});

// POST /api/admin/election/close
router.post('/election/close', requireAdmin, async (req, res) => {
  try {
    const election = await getOrCreateElection();
    election.status = 'closed';
    await election.save();
    res.json({ status: election.status });
  } catch {
    res.status(500).json({ message: 'Failed to close election.' });
  }
});

// POST /api/admin/election/publish
router.post('/election/publish', requireAdmin, async (req, res) => {
  try {
    const election = await getOrCreateElection();
    if (election.status !== 'closed') {
      return res.status(400).json({ message: 'Election must be closed before publishing results.' });
    }
    election.status = 'published';
    await election.save();
    res.json({ status: election.status });
  } catch {
    res.status(500).json({ message: 'Failed to publish results.' });
  }
});

module.exports = router;
