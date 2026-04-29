const { ethers } = require('ethers');
const crypto = require('crypto');
const { getContract } = require('../config/blockchain');
const Vote = require('../models/Vote');
const logger = require('../config/logger');

const generateVotingToken = () => {
  // Anonymous token: UUID + random bytes, SHA256 hashed
  const raw = crypto.randomBytes(32).toString('hex') + Date.now().toString();
  const token = '0x' + crypto.createHash('sha256').update(raw).digest('hex');
  return token;
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const castVoteOnChain = async (tokenHash, candidateId) => {
  const contract = getContract();

  if (!contract) {
    // Mock blockchain response for development
    logger.warn('[DEV MODE] Mocking blockchain transaction');
    const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');
    const mockBlock = Math.floor(19000000 + Math.random() * 100000);
    const mockGas = Math.floor(21000 + Math.random() * 8000);

    return {
      transactionHash: mockTxHash,
      blockNumber: mockBlock,
      gasUsed: mockGas.toString(),
      status: 'confirmed',
    };
  }

  try {
    // Check if already voted on-chain
    const alreadyVoted = await contract.hasVoted(tokenHash);
    if (alreadyVoted) throw new Error('Token already used on blockchain');

    // Estimate gas
    const gasEstimate = await contract.castVote.estimateGas(tokenHash, candidateId);

    // Send transaction with 20% gas buffer
    const tx = await contract.castVote(tokenHash, candidateId, {
      gasLimit: (gasEstimate * 120n) / 100n,
    });

    logger.info(`Transaction submitted: ${tx.hash}`);

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1 ? 'confirmed' : 'failed',
    };
  } catch (err) {
    logger.error('Blockchain vote failed:', err.message);
    throw err;
  }
};

const getOnChainResults = async () => {
  const contract = getContract();
  if (!contract) return null;
  try {
    const totalVotes = await contract.getTotalVotes();
    return { totalVotes: totalVotes.toString() };
  } catch (err) {
    logger.error('Failed to get on-chain results:', err.message);
    return null;
  }
};

module.exports = { generateVotingToken, hashToken, castVoteOnChain, getOnChainResults };
