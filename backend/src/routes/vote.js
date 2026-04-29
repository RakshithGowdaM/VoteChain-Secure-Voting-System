const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const Vote = require('../models/Vote');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const { authenticate } = require('../middleware/auth');
const { castVoteOnChain } = require('../services/blockchainService');
const { getVotingGateStatus } = require('../services/electionService');
const logger = require('../config/logger');

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/vote/cast
router.post('/cast', authenticate, [
  body('candidateId').notEmpty().withMessage('Candidate ID required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { tokenHash, step } = req.user;
    const { candidateId } = req.body;

    if (step !== 'verified') {
      return res.status(403).json({ success: false, message: 'Authentication step invalid' });
    }

    const gate = await getVotingGateStatus();
    if (!gate.allowed) {
      return res.status(403).json({ success: false, message: gate.message });
    }

    // Check if token already used
    const existingVote = await Vote.findOne({ tokenHash });
    if (existingVote) {
      return res.status(409).json({ success: false, message: 'This voting token has already been used' });
    }

    // Enforce phone-level one-time vote by requiring a linked user record
    const userRecord = await User.findOne({ tokenHash });
    if (!userRecord) {
      return res.status(401).json({ success: false, message: 'Invalid voting session. Please verify OTP again.' });
    }
    if (userRecord.hasVoted) {
      return res.status(409).json({ success: false, message: 'This phone number has already cast a vote.' });
    }

    // Validate candidate
    const candidate = await Candidate.findOne({ candidateId, isActive: true });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Create pending vote record (idempotency guard)
    const voteRecord = await Vote.create({
      tokenHash,
      candidateId,
      status: 'pending',
    });

    // Cast on blockchain
    let txResult;
    try {
      txResult = await castVoteOnChain(tokenHash, candidateId);
    } catch (chainErr) {
      await Vote.deleteOne({ _id: voteRecord._id });
      logger.error('Blockchain cast failed:', chainErr.message);
      return res.status(500).json({ success: false, message: 'Blockchain transaction failed. Vote not recorded.' });
    }

    // Update vote record with transaction details
    voteRecord.transactionHash = txResult.transactionHash;
    voteRecord.blockNumber = txResult.blockNumber;
    voteRecord.gasUsed = txResult.gasUsed;
    voteRecord.status = txResult.status;
    await voteRecord.save();

    // Mark user as voted (prevent duplicate votes from same phone number)
    userRecord.hasVoted = true;
    userRecord.votedAt = new Date();
    await userRecord.save();

    // Update candidate vote count cache
    await Candidate.findOneAndUpdate({ candidateId }, { $inc: { voteCount: 1 } });

    logger.info(`Vote cast: candidateId=${candidateId}, tx=${txResult.transactionHash}`);

    res.json({
      success: true,
      message: 'Vote successfully recorded on the blockchain',
      data: {
        transactionHash: txResult.transactionHash,
        blockNumber: txResult.blockNumber,
        gasUsed: txResult.gasUsed,
        candidateName: candidate.name,
        candidateParty: candidate.party,
        network: 'Ethereum Mainnet',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('Cast vote error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to cast vote' });
  }
});

// GET /api/vote/status — check if token used
router.get('/status', authenticate, async (req, res) => {
  try {
    const { tokenHash } = req.user;
    const vote = await Vote.findOne({ tokenHash });
    res.json({ success: true, hasVoted: !!vote, vote: vote || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Status check failed' });
  }
});

// GET /api/vote/verify/:txHash — public verify
router.get('/verify/:txHash', async (req, res) => {
  try {
    const rawTxHash = (req.params.txHash || '').trim();
    let vote = null;

    if (rawTxHash.includes('...')) {
      const [prefix = '', suffix = ''] = rawTxHash.split('...');
      const cleanPrefix = prefix.trim();
      const cleanSuffix = suffix.trim();

      if (cleanPrefix.length < 4 || cleanSuffix.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Abbreviated hash is too short. Use a longer prefix/suffix or full hash.',
        });
      }

      const partialPattern = new RegExp(
        `^${escapeRegExp(cleanPrefix)}[a-fA-F0-9]+${escapeRegExp(cleanSuffix)}$`,
        'i'
      );

      const matches = await Vote.find({ transactionHash: partialPattern }).limit(2);
      if (matches.length > 1) {
        return res.status(409).json({
          success: false,
          message: 'Multiple transactions match this abbreviated hash. Enter the full hash.',
        });
      }
      vote = matches[0] || null;
    } else {
      vote = await Vote.findOne({ transactionHash: rawTxHash });
    }

    if (!vote) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({
      success: true,
      data: {
        transactionHash: vote.transactionHash,
        blockNumber: vote.blockNumber,
        status: vote.status,
        timestamp: vote.createdAt,
        candidateId: vote.candidateId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

module.exports = router;
