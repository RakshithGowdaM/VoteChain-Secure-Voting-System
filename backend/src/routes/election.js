'use strict';
const router = require('express').Router();
const Election = require('../models/Election');

async function getOrCreateElection() {
  let election = await Election.findOne();
  if (!election) election = await Election.create({});
  return election;
}

// GET /api/election/status
router.get('/status', async (req, res) => {
  try {
    const election = await getOrCreateElection();
    res.json({ status: election.status, name: election.name });
  } catch {
    res.status(500).json({ message: 'Failed to get election status.' });
  }
});

module.exports = router;
