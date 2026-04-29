import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResults, getElectionStatus } from '../api';
import Header from '../components/Header';
import Spinner from '../components/Spinner';

function ResultBar({ candidate, votes, maxVotes }) {
  const pct = maxVotes > 0 ? Math.round((votes / maxVotes) * 100) : 0;
  return (
    <div className="result-row">
      <div className="result-label">
        <span className="result-name">{candidate}</span>
        <span className="result-votes">{votes} vote{votes !== 1 ? 's' : ''}</span>
      </div>
      <div className="result-bar-bg">
        <div className="result-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="result-pct">{pct}%</span>
    </div>
  );
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = localStorage.getItem('role') === 'admin';

  useEffect(() => {
    Promise.all([getResults(), getElectionStatus()])
      .then(([resData, statusData]) => {
        setResults(resData.data || []);
        setStatus(statusData.data?.status);
      })
      .catch(() => setError('Unable to load results.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const totalVotes = results.reduce((sum, r) => sum + (r.votes || 0), 0);
  const maxVotes = results.length > 0 ? Math.max(...results.map((r) => r.votes || 0)) : 0;

  const winner = results.find((r) => r.votes === maxVotes && maxVotes > 0);

  return (
    <>
      <Header isAdmin={isAdmin} />
      <main className="page results-page">
        <h2 className="page-title">Election Results</h2>

        {status && (
          <span className={`badge badge-${status}`}>
            {status === 'open' ? '🟢 Voting Open' : status === 'closed' ? '🔴 Voting Closed' : '📊 Results Published'}
          </span>
        )}

        {error && <p className="error-msg">{error}</p>}

        {results.length === 0 ? (
          <p className="empty-state">No results available yet.</p>
        ) : (
          <>
            {status === 'published' && winner && (
              <div className="winner-banner">
                🏆 Winner: <strong>{winner.name}</strong> with {winner.votes} vote{winner.votes !== 1 ? 's' : ''}
              </div>
            )}

            <div className="results-summary">
              <span>Total Votes Cast: <strong>{totalVotes}</strong></span>
            </div>

            <div className="results-list">
              {results
                .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                .map((r) => (
                  <ResultBar
                    key={r._id}
                    candidate={r.name}
                    votes={r.votes || 0}
                    maxVotes={maxVotes}
                  />
                ))}
            </div>
          </>
        )}

        <button className="btn btn-outline back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </main>
    </>
  );
}
