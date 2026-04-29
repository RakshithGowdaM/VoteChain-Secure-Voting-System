// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VoteChain — Blockchain-Based Voting Smart Contract
/// @author VoteChain Team
/// @notice Immutable, tamper-proof vote recording on Ethereum

contract VoteChain {
    // ── State Variables ───────────────────────────────────────────────────────

    address public immutable owner;
    string public electionName;
    uint256 public electionStart;
    uint256 public electionEnd;
    bool public paused;

    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
        bool isActive;
    }

    mapping(uint256 => Candidate) public candidates;
    mapping(string => bool) public tokenUsed;        // tokenHash → used
    mapping(string => uint256) public tokenVote;     // tokenHash → candidateId
    mapping(uint256 => bool) public candidateExists;

    uint256[] public candidateIds;
    uint256 public totalVotes;

    // ── Events ────────────────────────────────────────────────────────────────

    event VoteCast(
        string indexed tokenHash,
        uint256 indexed candidateId,
        uint256 timestamp,
        uint256 totalVotes
    );

    event CandidateAdded(uint256 indexed id, string name, string party);
    event ElectionPaused(address by);
    event ElectionResumed(address by);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier electionActive() {
        require(!paused, "Election is paused");
        require(block.timestamp >= electionStart, "Election has not started");
        require(block.timestamp <= electionEnd, "Election has ended");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        string memory _electionName,
        uint256 _electionStart,
        uint256 _electionEnd
    ) {
        require(_electionEnd > _electionStart, "Invalid election window");
        owner = msg.sender;
        electionName = _electionName;
        electionStart = _electionStart;
        electionEnd = _electionEnd;
    }

    // ── Admin Functions ───────────────────────────────────────────────────────

    function addCandidate(
        uint256 _id,
        string memory _name,
        string memory _party
    ) external onlyOwner {
        require(!candidateExists[_id], "Candidate ID already exists");
        require(bytes(_name).length > 0, "Name required");
        candidates[_id] = Candidate({
            id: _id,
            name: _name,
            party: _party,
            voteCount: 0,
            isActive: true
        });
        candidateExists[_id] = true;
        candidateIds.push(_id);
        emit CandidateAdded(_id, _name, _party);
    }

    function pauseElection() external onlyOwner {
        paused = true;
        emit ElectionPaused(msg.sender);
    }

    function resumeElection() external onlyOwner {
        paused = false;
        emit ElectionResumed(msg.sender);
    }

    // ── Voting ────────────────────────────────────────────────────────────────

    /// @notice Cast a vote. Token hash ensures anonymity + prevents double-voting.
    /// @param tokenHash SHA256 hash of the user's one-time voting token
    /// @param candidateId ID of the chosen candidate
    function castVote(string memory tokenHash, uint256 candidateId)
        external
        electionActive
    {
        require(bytes(tokenHash).length == 66, "Invalid token format"); // 0x + 64 hex chars
        require(!tokenUsed[tokenHash], "Token already used");
        require(candidateExists[candidateId], "Candidate does not exist");
        require(candidates[candidateId].isActive, "Candidate is not active");

        tokenUsed[tokenHash] = true;
        tokenVote[tokenHash] = candidateId;
        candidates[candidateId].voteCount += 1;
        totalVotes += 1;

        emit VoteCast(tokenHash, candidateId, block.timestamp, totalVotes);
    }

    // ── View Functions ────────────────────────────────────────────────────────

    function hasVoted(string memory tokenHash) external view returns (bool) {
        return tokenUsed[tokenHash];
    }

    function getVoteCount(uint256 candidateId) external view returns (uint256) {
        require(candidateExists[candidateId], "Candidate does not exist");
        return candidates[candidateId].voteCount;
    }

    function getTotalVotes() external view returns (uint256) {
        return totalVotes;
    }

    function isElectionActive() external view returns (bool) {
        return !paused
            && block.timestamp >= electionStart
            && block.timestamp <= electionEnd;
    }

    function getAllResults() external view returns (
        uint256[] memory ids,
        string[] memory names,
        string[] memory parties,
        uint256[] memory voteCounts
    ) {
        uint256 len = candidateIds.length;
        ids = new uint256[](len);
        names = new string[](len);
        parties = new string[](len);
        voteCounts = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            uint256 id = candidateIds[i];
            Candidate storage c = candidates[id];
            ids[i] = c.id;
            names[i] = c.name;
            parties[i] = c.party;
            voteCounts[i] = c.voteCount;
        }
    }
}
