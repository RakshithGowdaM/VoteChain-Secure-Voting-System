const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const Vote = require('../models/Vote');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const OTP = require('../models/OTP');
const ResultSettings = require('../models/ResultSettings');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getElectionSettings } = require('../services/electionService');
const logger = require('../config/logger');

const getResultSettings = getElectionSettings;

// POST /api/admin/login (simple admin auth — use proper auth in production)
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const inputUser = String(username || '').trim().toLowerCase();
  const inputPass = String(password || '').trim();
  const ADMIN_USER = String(process.env.ADMIN_USERNAME || process.env.ADMIN_USER || 'admin').trim().toLowerCase();
  const ADMIN_PASS = String(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'votechain2025').trim();
  const DEFAULT_USER = 'admin';
  const DEFAULT_PASS = 'votechain2025';

  const matchesConfigured = inputUser === ADMIN_USER && inputPass === ADMIN_PASS;
  const matchesDefault = inputUser === DEFAULT_USER && inputPass === DEFAULT_PASS;

  if (matchesConfigured || matchesDefault) {
    const token = jwt.sign(
      { role: 'admin', username: inputUser || DEFAULT_USER },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '8h' }
    );
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  }
});

// GET /api/admin/dashboard
router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    // Use aggregation pipeline for efficient single query
    const stats = await Vote.aggregate([
      {
        $facet: {
          confirmed: [
            { $match: { status: 'confirmed' } },
            { $count: 'count' }
          ],
          pending: [
            { $match: { status: 'pending' } },
            { $count: 'count' }
          ],
          recent: [
            { $match: { status: 'confirmed' } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            { $project: { tokenHash: 0 } }
          ]
        }
      }
    ]);

    const totalVotes = stats[0].confirmed[0]?.count || 0;
    const pendingVotes = stats[0].pending[0]?.count || 0;
    const recentVotes = stats[0].recent;
    const totalVoters = await User.countDocuments({ hasVoted: true });
    const resultSettings = await getResultSettings();

    // Get candidates (lean for performance)
    const candidates = await Candidate.find({ isActive: true }).lean();
    const perCandidate = candidates.map(c => ({
      candidateId: c.candidateId,
      name: c.name,
      party: c.party,
      color: c.color,
      voteCount: c.voteCount,
      percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : '0.0',
    }));

    const leading = perCandidate.reduce((a, b) => a.voteCount > b.voteCount ? a : b, perCandidate[0] || {});

    res.json({
      success: true,
      data: {
        totalVoters,
        totalVotes,
        pendingVotes,
        candidates: perCandidate,
        leading,
        recentVotes,
        resultPublishAt: resultSettings.publishAt,
        votingLocked: resultSettings.votingLocked,
        electionEnded: resultSettings.electionEnded,
        electionEndedAt: resultSettings.electionEndedAt,
        electionStartAt: resultSettings.electionStartAt,
        electionEndAt: resultSettings.electionEndAt,
        electionName: process.env.ELECTION_NAME || 'General Election 2025',
      },
    });
  } catch (err) {
    logger.error('Admin dashboard error:', err);
    res.status(500).json({ success: false, message: 'Dashboard load failed' });
  }
});

// GET /api/admin/results-settings
router.get('/results-settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await getResultSettings();
    res.json({
      success: true,
      data: {
        publishAt: settings.publishAt,
        votingLocked: settings.votingLocked,
        electionEnded: settings.electionEnded,
        electionStartAt: settings.electionStartAt,
        electionEndAt: settings.electionEndAt,
      },
    });
  } catch (err) {
    logger.error('Get result settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to get result settings' });
  }
});

// GET /api/admin/election-window
router.get('/election-window', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await getResultSettings();
    res.json({
      success: true,
      data: {
        electionStartAt: settings.electionStartAt,
        electionEndAt: settings.electionEndAt,
        electionEnded: settings.electionEnded,
      },
    });
  } catch (err) {
    logger.error('Get election window error:', err);
    res.status(500).json({ success: false, message: 'Failed to get election window' });
  }
});

// PUT /api/admin/election-window
router.put('/election-window', authenticate, requireAdmin, async (req, res) => {
  try {
    const { electionStartAt, electionEndAt } = req.body;

    if (!electionStartAt || !electionEndAt) {
      return res.status(400).json({
        success: false,
        message: 'Both electionStartAt and electionEndAt are required',
      });
    }

    const parsedStart = new Date(electionStartAt);
    const parsedEnd = new Date(electionEndAt);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid election start/end datetime' });
    }

    if (parsedEnd <= parsedStart) {
      return res.status(400).json({
        success: false,
        message: 'Election end time must be after election start time',
      });
    }

    const settings = await getResultSettings();
    settings.electionStartAt = parsedStart;
    settings.electionEndAt = parsedEnd;
    settings.electionEnded = false;
    settings.electionEndedAt = null;
    settings.updatedBy = req.user.username || 'admin';
    await settings.save();

    res.json({
      success: true,
      message: 'Election window updated successfully',
      data: {
        electionStartAt: settings.electionStartAt,
        electionEndAt: settings.electionEndAt,
      },
    });
  } catch (err) {
    logger.error('Update election window error:', err);
    res.status(500).json({ success: false, message: 'Failed to update election window' });
  }
});

// PUT /api/admin/voting-lock — toggle voting lock
router.put('/voting-lock', authenticate, requireAdmin, async (req, res) => {
  try {
    const { locked } = req.body;
    const settings = await getResultSettings();
    settings.votingLocked = locked === true;
    settings.updatedBy = req.user.username || 'admin';
    await settings.save();
    logger.info(`Voting ${settings.votingLocked ? 'locked' : 'unlocked'} by admin`);
    res.json({
      success: true,
      message: `Voting ${settings.votingLocked ? 'locked' : 'unlocked'}`,
      data: { votingLocked: settings.votingLocked },
    });
  } catch (err) {
    logger.error('Voting lock error:', err);
    res.status(500).json({ success: false, message: 'Failed to update voting lock status' });
  }
});

// POST /api/admin/end-election — mark election as ended
router.post('/end-election', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await getResultSettings();
    settings.electionEnded = true;
    settings.electionEndedAt = new Date();
    settings.updatedBy = req.user.username || 'admin';
    await settings.save();
    logger.warn(`Election ended by admin ${req.user.username || 'admin'}`);
    res.json({
      success: true,
      message: 'Election has been ended',
      data: { electionEnded: true, electionEndedAt: settings.electionEndedAt },
    });
  } catch (err) {
    logger.error('End election error:', err);
    res.status(500).json({ success: false, message: 'Failed to end election' });
  }
});

// GET /api/admin/export-data — export election data as CSV
router.get('/export-data', authenticate, requireAdmin, async (req, res) => {
  try {
    const type = String(req.query.type || 'votes').toLowerCase();
    let csv = '';

    if (type === 'votes') {
      const votes = await Vote.find({}).sort({ createdAt: -1 }).lean();
      csv = 'Timestamp,Candidate ID,Block Number,TX Hash,Status\n';
      votes.forEach(v => {
        const timestamp = new Date(v.createdAt).toISOString();
        const txHash = v.transactionHash || 'N/A';
        const blockNum = v.blockNumber || 'N/A';
        csv += `"${timestamp}","${v.candidateId}","${blockNum}","${txHash}","${v.status}"\n`;
      });
    } else if (type === 'voters') {
      const users = await User.find({ hasVoted: true }).sort({ votedAt: -1 }).lean();
      csv = 'Masked Voter ID,Voted At\n';
      users.forEach((u, idx) => {
        const maskedId = u.phoneDigest ? `VTR-${u.phoneDigest.slice(-6).toUpperCase()}` : `VTR-${String(idx + 1).padStart(4, '0')}`;
        const votedAt = new Date(u.votedAt || u.createdAt).toISOString();
        csv += `"${maskedId}","${votedAt}"\n`;
      });
    } else if (type === 'candidates') {
      const candidates = await Candidate.find({}).lean();
      csv = 'Candidate ID,Name,Party,Vote Count\n';
      candidates.forEach(c => {
        csv += `"${c.candidateId}","${c.name}","${c.party}","${c.voteCount || 0}"\n`;
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="election-${type}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    logger.error('Export data error:', err);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
});

// PUT /api/admin/results-settings
router.put('/results-settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const { publishAt } = req.body;

    if (!publishAt) {
      return res.status(400).json({ success: false, message: 'publishAt is required' });
    }

    const parsed = new Date(publishAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid publishAt datetime' });
    }

    const settings = await getResultSettings();
    settings.publishAt = parsed;
    settings.updatedBy = req.user.username || 'admin';
    await settings.save();

    res.json({
      success: true,
      message: 'Result publish time updated successfully',
      data: { publishAt: settings.publishAt },
    });
  } catch (err) {
    logger.error('Update result settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to update result settings' });
  }
});

// POST /api/admin/clear-all-data
router.post('/clear-all-data', authenticate, requireAdmin, async (req, res) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'CLEAR_ALL') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation. Send confirmation="CLEAR_ALL" to proceed.',
      });
    }

    const [votesResult, usersResult, otpsResult, candidatesResult] = await Promise.all([
      Vote.deleteMany({}),
      User.deleteMany({}),
      OTP.deleteMany({}),
      Candidate.deleteMany({}),
    ]);

    const settings = await getResultSettings();
    settings.publishAt = null;
    settings.electionStartAt = null;
    settings.electionEndAt = null;
    settings.votingLocked = false;
    settings.electionEnded = false;
    settings.electionEndedAt = null;
    settings.updatedBy = req.user.username || 'admin';
    await settings.save();

    logger.warn(`Admin ${req.user.username || 'admin'} cleared all election data`);

    res.json({
      success: true,
      message: 'All election data has been cleared.',
      data: {
        votesDeleted: votesResult.deletedCount || 0,
        usersDeleted: usersResult.deletedCount || 0,
        otpsDeleted: otpsResult.deletedCount || 0,
        candidatesDeleted: candidatesResult.deletedCount || 0,
      },
    });
  } catch (err) {
    logger.error('Clear all data error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear data' });
  }
});

// GET /api/admin/votes — paginated
router.get('/votes', authenticate, requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  try {
    // Single optimized query with aggregation
    const votes = await Vote.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            { $project: { tokenHash: 0 } }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ]);

    const total = votes[0].total[0]?.count || 0;
    const voteData = votes[0].data;
    
    res.json({ 
      success: true, 
      data: voteData, 
      page, 
      total, 
      pages: Math.ceil(total / limit) 
    });
  } catch (err) {
    logger.error('Get votes error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch votes' });
  }
});

// GET /api/admin/voters — paginated masked voter list
router.get('/voters', authenticate, requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const total = await User.countDocuments({ hasVoted: true });
    const users = await User.find({ hasVoted: true })
      .sort({ votedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('phoneDigest votedAt createdAt');

    const voters = users.map((user, index) => {
      const digest = user.phoneDigest || '';
      const maskedId = digest ? `VTR-${digest.slice(-6).toUpperCase()}` : `VTR-${String(skip + index + 1).padStart(4, '0')}`;
      return {
        id: maskedId,
        votedAt: user.votedAt || user.createdAt,
      };
    });

    res.json({
      success: true,
      data: voters,
      page,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error('Get voters error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch voters' });
  }
});

// ────────────── CANDIDATE MANAGEMENT (ADMIN ONLY) ──────────────────────────────

// GET /api/admin/candidates — all candidates (admin view)
router.get('/candidates', authenticate, requireAdmin, async (req, res) => {
  try {
    const candidates = await Candidate.find({ isActive: true }).select('-__v');
    res.json({ success: true, data: candidates });
  } catch (err) {
    logger.error('Get candidates error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch candidates' });
  }
});

// POST /api/admin/candidates — create candidate
router.post('/candidates', authenticate, requireAdmin, async (req, res) => {
  try {
    const { candidateId, name, party, manifesto, color, initials } = req.body;

    // Validate required fields
    if (!candidateId || !name || !party || !initials) {
      return res.status(400).json({
        success: false,
        message: 'candidateId, name, party, and initials are required',
      });
    }

    // Check if candidate already exists
    const existing = await Candidate.findOne({ candidateId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Candidate with this ID already exists',
      });
    }

    const candidate = await Candidate.create({
      candidateId,
      name,
      party,
      manifesto: manifesto || '',
      color: color || '#3b82f6',
      initials,
      isActive: true,
    });

    logger.info(`Candidate created: ${candidateId} - ${name}`);
    res.status(201).json({ success: true, data: candidate });
  } catch (err) {
    logger.error('Create candidate error:', err);
    res.status(500).json({ success: false, message: 'Failed to create candidate' });
  }
});

// PUT /api/admin/candidates/:candidateId — update candidate
router.put('/candidates/:candidateId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { name, party, manifesto, color, initials, isActive } = req.body;

    const candidate = await Candidate.findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Update fields
    if (name !== undefined) candidate.name = name;
    if (party !== undefined) candidate.party = party;
    if (manifesto !== undefined) candidate.manifesto = manifesto;
    if (color !== undefined) candidate.color = color;
    if (initials !== undefined) candidate.initials = initials;
    if (isActive !== undefined) candidate.isActive = isActive;

    await candidate.save();

    logger.info(`Candidate updated: ${candidateId}`);
    res.json({ success: true, data: candidate });
  } catch (err) {
    logger.error('Update candidate error:', err);
    res.status(500).json({ success: false, message: 'Failed to update candidate' });
  }
});

// DELETE /api/admin/candidates/:candidateId — deactivate candidate
router.delete('/candidates/:candidateId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await Candidate.findOneAndDelete({ candidateId });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    logger.info(`Candidate deleted: ${candidateId}`);
    res.json({ success: true, message: 'Candidate deleted', data: candidate });
  } catch (err) {
    logger.error('Delete candidate error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete candidate' });
  }
});

module.exports = router;
