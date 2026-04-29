import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCandidates, castVote, getElectionStatus } from '../api';
import CandidateCard from '../components/CandidateCard';
import Header from '../components/Header';
import Spinner from '../components/Spinner';

export default function VotePage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [electionOpen, setElectionOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    Promise.all([getCandidates(), getElectionStatus()])
      .then(([candRes, statusRes]) => {
        setCandidates(candRes.data);
        setElectionOpen(statusRes.data?.status === 'open');
      })
      .catch(() => setError('Failed to load election data.'))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleVote() {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await castVote(selected);
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cast vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <>
      <Header />
      <main className="page vote-page">
        <h2 className="page-title">Cast Your Vote</h2>

        {!electionOpen && (
          <div className="alert alert-warning">
            The election is currently closed. Voting is not available.
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        {success ? (
          <div className="card vote-success">
            <h3>✅ Vote Recorded!</h3>
            <p>Your anonymous vote has been securely recorded on the blockchain.</p>
            {success.txHash && (
              <p>
                Transaction:{' '}
                <a
                  href={`${process.env.REACT_APP_BLOCKCHAIN_EXPLORER || 'https://etherscan.io/tx'}/${success.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  {success.txHash.slice(0, 12)}…{success.txHash.slice(-6)}
                </a>
              </p>
            )}
            <button className="btn btn-outline" onClick={() => navigate('/results')}>
              View Results →
            </button>
          </div>
        ) : (
          <>
            <p className="vote-instructions">
              Select a candidate below, then click <strong>Submit Vote</strong>.
              Your vote is anonymous and tamper-proof.
            </p>
            <div className="candidates-grid">
              {candidates.map((c) => (
                <CandidateCard
                  key={c._id}
                  candidate={c}
                  selected={selected === c._id}
                  onSelect={setSelected}
                  disabled={!electionOpen || submitting}
                />
              ))}
            </div>
            {candidates.length === 0 && (
              <p className="empty-state">No candidates available yet.</p>
            )}
            <button
              className="btn btn-primary vote-submit"
              onClick={handleVote}
              disabled={!selected || !electionOpen || submitting}
            >
              {submitting ? <Spinner /> : 'Submit Vote'}
            </button>
          </>
        )}
      </main>
    </>
  );
}
