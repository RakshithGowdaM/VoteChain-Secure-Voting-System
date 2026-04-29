const Candidate = require('../models/Candidate');
const ResultSettings = require('../models/ResultSettings');

const getElectionSettings = async () => {
  let settings = await ResultSettings.findOne({ key: 'global' });
  if (!settings) {
    settings = await ResultSettings.create({ key: 'global', publishAt: null });
  }
  return settings;
};

const getVotingGateStatus = async () => {
  const settings = await getElectionSettings();
  const activeCandidateCount = await Candidate.countDocuments({ isActive: true });
  const now = new Date();

  if (activeCandidateCount === 0) {
    return {
      allowed: false,
      code: 'NO_CANDIDATES',
      message: 'Voting is not available yet. No active candidates have been configured.',
    };
  }

  if (settings.votingLocked) {
    return {
      allowed: false,
      code: 'LOCKED',
      message: 'Voting is currently locked by the admin.',
    };
  }

  if (settings.electionEnded) {
    return {
      allowed: false,
      code: 'ENDED',
      message: 'The election has ended. No new votes can be cast.',
    };
  }

  if (settings.electionStartAt && now < settings.electionStartAt) {
    return {
      allowed: false,
      code: 'NOT_STARTED',
      message: `Voting starts at ${settings.electionStartAt.toISOString()}`,
    };
  }

  if (settings.electionEndAt && now > settings.electionEndAt) {
    return {
      allowed: false,
      code: 'ENDED_BY_SCHEDULE',
      message: 'Voting window has ended based on the configured schedule.',
    };
  }

  return {
    allowed: true,
    code: 'OPEN',
    message: 'Voting is open.',
    settings,
  };
};

module.exports = {
  getElectionSettings,
  getVotingGateStatus,
};
