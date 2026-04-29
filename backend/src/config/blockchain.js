const { ethers } = require('ethers');
const logger = require('./logger');

let provider = null;
let wallet = null;
let contract = null;

const VotingABI = [
  "function castVote(string memory tokenHash, uint256 candidateId) external",
  "function hasVoted(string memory tokenHash) external view returns (bool)",
  "function getVoteCount(uint256 candidateId) external view returns (uint256)",
  "function getTotalVotes() external view returns (uint256)",
  "function isElectionActive() external view returns (bool)",
  "function candidates(uint256 id) external view returns (string memory name, string memory party, uint256 voteCount)",
  "event VoteCast(string indexed tokenHash, uint256 indexed candidateId, uint256 timestamp)",
];

const initBlockchain = () => {
  try {
    if (!process.env.BLOCKCHAIN_RPC_URL || !process.env.PRIVATE_KEY) {
      logger.warn('⚠️  Blockchain env vars not set — running in MOCK mode');
      return false;
    }
    provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    if (process.env.CONTRACT_ADDRESS) {
      contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VotingABI, wallet);
    }
    logger.info('✅ Blockchain provider initialized');
    return true;
  } catch (err) {
    logger.error('❌ Blockchain init failed:', err.message);
    return false;
  }
};

const getContract = () => contract;
const getProvider = () => provider;
const getWallet = () => wallet;

module.exports = { initBlockchain, getContract, getProvider, getWallet, VotingABI };
